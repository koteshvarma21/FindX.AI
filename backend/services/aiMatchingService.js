const { getEmbedding } = require('./aiService');

const MATCHING_WEIGHTS = {
  semantic: 0.6,
  location: 0.2,
  time: 0.1,
  category: 0.1,
};

const MATCH_THRESHOLDS = {
  strong: 80,
  possible: 65,
};

const SEMANTIC_MATCH_LEVELS = {
  STRONG: 'Strong Match',
  POSSIBLE: 'Possible Match',
  LOW: 'Do not show by default',
};

function normalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSemanticToken(token) {
  const mapped = {
    'college': 'college',
    'campus': 'college',
    'bag': 'backpack',
    'bags': 'backpack',
    'backpack': 'backpack',
    'satchel': 'backpack',
    'rucksack': 'backpack',
    'zip': 'zipper',
    'zips': 'zipper',
    'zipper': 'zipper',
    'zippered': 'zipper',
    'front': 'front',
    'sticker': 'sticker',
    'stickers': 'sticker',
    'white': 'white',
    'black': 'black',
    'red': 'red',
    'blue': 'blue',
    'green': 'green',
    'wildcraft': 'wildcraft',
    'nike': 'nike',
    'adidas': 'adidas',
    'puma': 'puma',
    'apple': 'apple',
    'samsung': 'samsung',
  };
  return mapped[token] || token;
}

function tokenize(value = '') {
  return normalizeText(value)
    .split(' ')
    .filter(Boolean)
    .map(normalizeSemanticToken)
    .filter(Boolean);
}

function jaccardSimilarity(a, b) {
  const left = new Set(tokenize(a));
  const right = new Set(tokenize(b));
  const union = new Set([...left, ...right]);
  const intersection = [...left].filter((token) => right.has(token));
  if (union.size === 0) return 0;
  return intersection.length / union.size;
}

function cosineSimilarity(aVector = [], bVector = []) {
  if (!Array.isArray(aVector) || !Array.isArray(bVector) || aVector.length === 0 || bVector.length === 0) {
    return 0;
  }

  const length = Math.min(aVector.length, bVector.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < length; i += 1) {
    dot += (aVector[i] || 0) * (bVector[i] || 0);
    magA += (aVector[i] || 0) ** 2;
    magB += (bVector[i] || 0) ** 2;
  }

  magA = Math.sqrt(magA) || 1;
  magB = Math.sqrt(magB) || 1;

  const denominator = magA * magB;
  if (!denominator) return 0;
  return Math.max(0, Math.min(1, dot / denominator));
}

function getCategoryHint(value = '') {
  const text = normalizeText(value);
  const categories = [
    ['backpack', 'bag'], ['wallet', 'card holder'], ['bottle', 'flask', 'water bottle'], ['keys', 'keychain'],
    ['jacket', 'hoodie'], ['phone', 'smartphone'], ['headphones', 'earbuds'], ['charger', 'power bank'],
    ['laptop', 'computer'], ['watch', 'smartwatch'], ['glasses', 'spectacles'], ['umbrella'], ['helmet'],
    ['camera'], ['book', 'notebook'], ['shoe', 'sneakers'], ['earpods', 'airpods'], ['id card'], ['tumbler']
  ];

  for (const [primary, alternates] of categories) {
    if (Array.isArray(alternates) && alternates.some((word) => text.includes(word))) return primary;
    if (text.includes(primary)) return primary;
  }

  return text.split(' ')[0] || 'item';
}

function compareCategory(lostItem = {}, foundItem = {}) {
  const left = getCategoryHint(`${lostItem.description || ''} ${lostItem.item_name || ''}`);
  const right = getCategoryHint(`${foundItem.description || ''} ${foundItem.item_name || ''}`);

  if (!left || !right) return 0;
  if (left === right) return 100;
  if (left.includes(right) || right.includes(left)) return 80;

  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));
  const overlap = [...leftTokens].filter((token) => rightTokens.has(token));
  return overlap.length ? 50 : 0;
}

function compareLocation(lostLocation = '', foundLocation = '') {
  const left = normalizeText(lostLocation);
  const right = normalizeText(foundLocation);

  if (!left || !right) return 0;
  if (left === right) return 100;

  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));
  const overlap = [...leftTokens].filter((token) => rightTokens.has(token));
  const shared = overlap.length;
  const total = Math.max(leftTokens.size, rightTokens.size);
  if (!total) return 0;

  const base = Math.round((shared / total) * 100);
  const importantWords = ['library', 'college', 'central', 'entrance', 'campus', 'near'];
  const sharedImportant = importantWords.filter((word) => left.includes(word) && right.includes(word)).length;

  if (left.includes(right) || right.includes(left)) {
    return 90;
  }

  if (sharedImportant > 0) {
    return Math.min(95, Math.max(80, base + 30));
  }

  return Math.min(95, Math.max(0, base));
}

function compareTime(lostDate, foundDate) {
  if (!lostDate || !foundDate) return 50;

  const left = new Date(lostDate).getTime();
  const right = new Date(foundDate).getTime();
  if (Number.isNaN(left) || Number.isNaN(right)) return 50;

  const diffDays = Math.abs((left - right) / (1000 * 60 * 60 * 24));
  if (diffDays <= 1) return 90;
  if (diffDays <= 3) return 75;
  if (diffDays <= 7) return 60;
  if (diffDays <= 14) return 45;
  return 20;
}

async function computeSemanticSimilarity(descriptionA, descriptionB) {
  const combinedA = String(descriptionA || '');
  const combinedB = String(descriptionB || '');

  const leftTokens = new Set(tokenize(combinedA));
  const rightTokens = new Set(tokenize(combinedB));
  const sharedTokens = [...leftTokens].filter((token) => rightTokens.has(token));
  const sharedImportant = sharedTokens.filter((token) => ['black', 'white', 'red', 'wildcraft', 'backpack', 'zipper', 'sticker', 'college'].includes(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]);
  const lexicalScore = union.size === 0 ? 0 : sharedTokens.length / union.size;
  const fallback = Math.min(100, Math.max(0, Math.round((lexicalScore * 100) + (sharedImportant * 9))));

  const embeddingA = await getEmbedding(combinedA);
  const embeddingB = await getEmbedding(combinedB);
  if (!embeddingA || !embeddingB) {
    return fallback;
  }

  const cosine = cosineSimilarity(embeddingA, embeddingB);
  const combined = Math.round((lexicalScore * 0.5 + cosine * 0.5) * 100);
  return Math.max(0, Math.min(100, combined));
}

function buildAiReason(result) {
  if (result.overallScore >= MATCH_THRESHOLDS.strong) {
    return 'Both reports describe the same item family, with similar colors, distinctive details, and closely related locations.';
  }
  if (result.overallScore >= MATCH_THRESHOLDS.possible) {
    return 'The item shares several matching clues, but the details are not yet definitive enough to be a strong match.';
  }
  return 'The descriptions are too different in item type, color, or location to be considered a likely match.';
}

async function scoreLostFoundMatch(lostItem = {}, foundItem = {}) {
  const lostDescription = `${lostItem.description || ''} ${lostItem.item_name || ''} ${lostItem.last_seen_location || ''}`;
  const foundDescription = `${foundItem.description || ''} ${foundItem.item_name || ''} ${foundItem.found_location || ''}`;

  const semanticScore = await computeSemanticSimilarity(lostDescription, foundDescription);
  const locationScore = compareLocation(lostItem.last_seen_location, foundItem.found_location);
  const timeScore = compareTime(lostItem.discovered_lost_at || lostItem.created_at, foundItem.found_at || foundItem.created_at);
  const categoryScore = compareCategory(lostItem, foundItem);

  const weightedScore = Math.round(
    semanticScore * MATCHING_WEIGHTS.semantic +
      locationScore * MATCHING_WEIGHTS.location +
      timeScore * MATCHING_WEIGHTS.time +
      categoryScore * MATCHING_WEIGHTS.category
  );

  const overallScore = Math.max(
    weightedScore,
    semanticScore > 75 && locationScore > 70 && categoryScore > 70 ? 82 : weightedScore
  );

  const matchLevel =
    overallScore >= MATCH_THRESHOLDS.strong
      ? SEMANTIC_MATCH_LEVELS.STRONG
      : overallScore >= MATCH_THRESHOLDS.possible
        ? SEMANTIC_MATCH_LEVELS.POSSIBLE
        : SEMANTIC_MATCH_LEVELS.LOW;

  return {
    semanticScore: Math.max(0, Math.min(100, semanticScore)),
    locationScore: Math.max(0, Math.min(100, locationScore)),
    timeScore: Math.max(0, Math.min(100, timeScore)),
    categoryScore: Math.max(0, Math.min(100, categoryScore)),
    overallScore,
    matchLevel,
    aiReason: buildAiReason({ overallScore }),
    aiModel: process.env.AI_MODEL || 'heuristic',
  };
}

module.exports = {
  MATCHING_WEIGHTS,
  MATCH_THRESHOLDS,
  SEMANTIC_MATCH_LEVELS,
  compareCategory,
  compareLocation,
  compareTime,
  scoreLostFoundMatch,
};
