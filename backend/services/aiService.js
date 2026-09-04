const AI_BASE_URL = process.env.AI_BASE_URL || 'https://api.featherless.ai/v1';
const AI_API_KEY = process.env.AI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'Qwen/Qwen3-32B';
const AI_VISION_MODEL = process.env.AI_VISION_MODEL;
const AI_EMBEDDING_MODEL = process.env.AI_EMBEDDING_MODEL || 'Qwen/Qwen3-Embedding-8B';

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
      if (entry?.role && entry?.content) return `${entry.role}: ${entry.content}`;
      if (entry?.answer) return entry.answer;
      if (entry?.text) return entry.text;
      if (entry?.question && entry?.answer) return `${entry.question} ${entry.answer}`;
      if (entry?.question) return entry.question;
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

function extractKnownFacts(originalDescription = '', conversation = []) {
  const text = `${originalDescription} ${toConversationText(conversation)}`.trim();
  const clean = normalizeText(text);

  const facts = {
    itemName: '',
    category: '',
    color: '',
    brand: '',
    size: '',
    material: '',
    model: '',
    visualDescription: '',
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
  if (foundItem) {
    facts.category = foundItem;
    facts.itemName = foundItem;
  }

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

function normalizeExtractedDetails(details = {}, fallback = {}) {
  return {
    itemName: details.itemName || fallback.itemName || '',
    category: details.category || fallback.category || '',
    color: details.color || fallback.color || '',
    brand: details.brand || fallback.brand || '',
    size: details.size || fallback.size || '',
    material: details.material || fallback.material || '',
    model: details.model || fallback.model || '',
    visualDescription: details.visualDescription || details.visual_description || fallback.visualDescription || '',
    uniqueFeatures: Array.isArray(details.uniqueFeatures)
      ? details.uniqueFeatures.filter(Boolean).map(String)
      : fallback.uniqueFeatures || [],
  };
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
    console.error('Featherless request failed:', error.message);
    return null;
  }
}

async function getEmbedding(text) {
  if (!text || !AI_API_KEY) return null;

  const data = await callFeatherless('/embeddings', {
    model: AI_EMBEDDING_MODEL,
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
      readyToGenerate: Boolean(facts.category && facts.color && facts.uniqueFeatures.length),
      usedFallback: true,
    };
  }

  try {
    const payload = {
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant for a lost-and-found app. Extract every known item detail, never repeat a question or ask for known information, ask exactly one useful identifying question at a time, and set readyToGenerate true after at most five useful questions. Return only JSON with question, readyToGenerate, and extractedDetails: {itemName, category, color, brand, size, material, model, visualDescription, uniqueFeatures}.'
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
    if (!data) {
      return { success: true, question: fallbackQuestion, extractedDetails: facts, readyToGenerate: false, usedFallback: true };
    }
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
    const extractedDetails = normalizeExtractedDetails(parsed?.extractedDetails, facts);
    const questionCount = Array.isArray(conversation)
      ? conversation.filter((entry) => entry?.role === 'assistant' || entry?.question).length
      : 0;
    const readyToGenerate = Boolean(parsed?.readyToGenerate) || questionCount >= 4 || Boolean(
      extractedDetails.category && extractedDetails.color && extractedDetails.uniqueFeatures.length
    );

    return {
      success: true,
      question,
      extractedDetails,
      readyToGenerate,
      usedFallback: !parsed,
    };
  } catch (_error) {
    return {
      success: true,
      question: fallbackQuestion,
      extractedDetails: facts,
      readyToGenerate: Boolean(facts.category && facts.color && facts.uniqueFeatures.length),
      usedFallback: true,
    };
  }
}

async function analyzeImage(imageData) {
  if (!AI_API_KEY) throw new Error('AI_API_KEY is not configured');
  if (!AI_VISION_MODEL) throw new Error('AI_VISION_MODEL is not configured');
  const data = await callFeatherless('/chat/completions', {
    model: AI_VISION_MODEL,
    messages: [
      { role: 'system', content: 'Analyze the uploaded lost-and-found item image. Return only JSON with itemName, category, color, brand, size, material, model, visualDescription, uniqueFeatures.' },
      { role: 'user', content: [{ type: 'text', text: 'Extract visible identifying details from this item.' }, { type: 'image_url', image_url: { url: imageData } }] },
    ],
    response_format: { type: 'json_object' },
  });
  if (!data) throw new Error('Vision provider request failed');
  const raw = data?.choices?.[0]?.message?.content || '';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (_error) {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const candidate = fenced ? fenced[1] : raw.match(/\{[\s\S]*\}/)?.[0];
    try { parsed = candidate ? JSON.parse(candidate) : null; } catch (_innerError) { parsed = null; }
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('Vision provider returned malformed JSON');
  const details = normalizeExtractedDetails(parsed);
  if (!details.category && !details.itemName && !details.visualDescription) throw new Error('Vision provider returned no useful item details');
  return details;
}

async function checkAIHealth() {
  const chatConfigured = Boolean(AI_API_KEY && AI_BASE_URL && AI_MODEL);
  const embeddingConfigured = Boolean(AI_API_KEY && AI_BASE_URL && AI_EMBEDDING_MODEL);
  const visionConfigured = Boolean(AI_API_KEY && AI_BASE_URL && AI_VISION_MODEL);
  const chatResponse = chatConfigured ? await callFeatherless('/chat/completions', {
    model: AI_MODEL,
    messages: [{ role: 'user', content: 'Reply with the word OK.' }],
    max_tokens: 4,
  }) : null;
  const embedding = embeddingConfigured ? await getEmbedding('FindX health check') : null;

  return {
    success: Boolean(chatResponse && embedding && embedding.length && visionConfigured),
    provider: 'Featherless',
    chatConfigured,
    embeddingConfigured,
    visionConfigured,
    imageGenerationConfigured: Boolean(process.env.OPENAI_API_KEY),
    chatModel: AI_MODEL,
    embeddingModel: AI_EMBEDDING_MODEL,
    chatWorking: Boolean(chatResponse),
    embeddingsWorking: Boolean(embedding && embedding.length),
  };
}

module.exports = {
  AI_BASE_URL,
  AI_MODEL,
  AI_VISION_MODEL,
  AI_EMBEDDING_MODEL,
  analyzeImage,
  callFeatherless,
  checkAIHealth,
  buildFallbackQuestion,
  extractKnownFacts,
  getEmbedding,
  getFollowUpQuestion,
  normalizeText,
  normalizeExtractedDetails,
  toConversationText,
};
