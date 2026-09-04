const AI_BASE_URL = process.env.AI_BASE_URL || 'https://api.featherless.ai/v1';
const AI_API_KEY = process.env.AI_API_KEY;

function normalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toConversationText(conversation = []) {
  if (!Array.isArray(conversation)) return '';

  return conversation
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry?.answer) return entry.answer;
      if (entry?.text) return entry.text;
      if (entry?.question && entry?.answer) return `${entry.question} ${entry.answer}`;
      return '';
    })
    .filter(Boolean)
    .join(' ');
}

function extractKnownFacts(originalDescription = '', conversation = []) {
  const text = `${originalDescription} ${toConversationText(conversation)}`.trim();
  const clean = normalizeText(text);

  const facts = {
    category: '',
    color: '',
    brand: '',
    uniqueFeatures: [],
  };

  const itemPatterns = [
    'backpack', 'wallet', 'phone', 'laptop', 'bottle', 'jacket', 'keys',
    'headphones', 'charger', 'bag', 'watch', 'tumbler', 'glasses', 'umbrella',
    'notebook', 'book', 'helmet', 'sneakers', 'shoe', 'camera', 'earpods', 'id card'
  ];
  const colorWords = ['black', 'white', 'blue', 'red', 'green', 'yellow', 'silver', 'grey', 'gray', 'brown', 'orange', 'purple'];
  const brandWords = ['wildcraft', 'nike', 'adidas', 'puma', 'hp', 'dell', 'asus', 'apple', 'samsung', 'mi', 'oneplus', 'asus'];

  const foundItem = itemPatterns.find((keyword) => clean.includes(keyword));
  if (foundItem) facts.category = foundItem;

  const foundColor = colorWords.find((keyword) => clean.includes(keyword));
  if (foundColor) facts.color = foundColor;

  const foundBrand = brandWords.find((keyword) => clean.includes(keyword));
  if (foundBrand) facts.brand = foundBrand;

  ['zipper', 'sticker', 'logo', 'engraving', 'scratch', 'damage', 'strap', 'handle', 'keychain', 'camera', 'marks', 'patch', 'zip']
    .forEach((feature) => {
      if (clean.includes(feature)) facts.uniqueFeatures.push(feature);
    });

  return facts;
}

function buildFallbackQuestion(originalDescription = '', conversation = []) {
  const facts = extractKnownFacts(originalDescription, conversation);
  const combined = normalizeText(`${originalDescription} ${toConversationText(conversation)}`);

  if (!facts.category && !combined) return 'What kind of item was it?';
  if (!facts.category) return 'What item was missing?';
  if (!facts.color) return `What color was the ${facts.category}?`;
  if (!facts.brand && !/skip|not sure|unknown/i.test(combined)) return `Do you remember a brand or maker for the ${facts.category}?`;
  if (!facts.uniqueFeatures.length) return `Was there anything distinctive about it — a sticker, logo, zipper, damage, or engraving?`;
  return 'Was anything else unique about it, such as a sticker, damage, special pocket, or personalized marking?';
}

async function callFeatherless(path, payload) {
  if (!AI_API_KEY) return null;

  try {
    const response = await fetch(`${AI_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `AI request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('Featherless request failed:', error.message);
    return null;
  }
}

async function getEmbedding(text) {
  if (!text || !AI_API_KEY) return null;

  const data = await callFeatherless('/embeddings', {
    model: process.env.AI_EMBEDDING_MODEL || 'nomic-embed-text-v1.5',
    input: String(text),
  });

  const embedding = data?.data?.[0]?.embedding || null;
  return Array.isArray(embedding) ? embedding : null;
}

async function getFollowUpQuestion({ originalDescription, conversation = [] }) {
  const facts = extractKnownFacts(originalDescription, conversation);
  const fallbackQuestion = buildFallbackQuestion(originalDescription, conversation);

  if (!AI_API_KEY) {
    return {
      success: true,
      question: fallbackQuestion,
      extractedDetails: facts,
      usedFallback: true,
    };
  }

  try {
    const payload = {
      model: process.env.AI_MODEL || 'qwen/qwen3-32b',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant for a lost-and-found app. Ask one concise follow-up question that helps identify the item. Do not ask for information already provided. Return JSON with keys question and extractedDetails: {category, color, brand, uniqueFeatures}.'
        },
        {
          role: 'user',
          content: JSON.stringify({
            originalDescription,
            conversation,
          }),
        }
      ],
      response_format: { type: 'json_object' },
    };

    const data = await callFeatherless('/chat/completions', payload);
    const raw = data?.choices?.[0]?.message?.content || '';
    let parsed = null;

    try {
      parsed = JSON.parse(raw);
    } catch (_error) {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch (_innerError) {
          parsed = null;
        }
      }
    }

    const question = parsed?.question || fallbackQuestion;
    const extractedDetails = {
      category: parsed?.extractedDetails?.category || facts.category,
      color: parsed?.extractedDetails?.color || facts.color,
      brand: parsed?.extractedDetails?.brand || facts.brand,
      uniqueFeatures: Array.isArray(parsed?.extractedDetails?.uniqueFeatures)
        ? parsed.extractedDetails.uniqueFeatures
        : facts.uniqueFeatures,
    };

    return {
      success: true,
      question,
      extractedDetails,
      usedFallback: false,
    };
  } catch (_error) {
    return {
      success: true,
      question: fallbackQuestion,
      extractedDetails: facts,
      usedFallback: true,
    };
  }
}

module.exports = {
  AI_BASE_URL,
  callFeatherless,
  buildFallbackQuestion,
  extractKnownFacts,
  getEmbedding,
  getFollowUpQuestion,
  normalizeText,
  toConversationText,
};
