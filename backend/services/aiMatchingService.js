const { getEmbedding } = require('./aiService');
const embeddingCache = new Map();

async function getCachedEmbedding(text) {
  const key = String(text || '').trim();
  if (!key) return null;
  if (embeddingCache.has(key)) return embeddingCache.get(key);
  const embedding = await getEmbedding(key);
  embeddingCache.set(key, embedding);
  return embedding;
}

const MATCHING_WEIGHTS = {
  semantic: 0.3,
  visualFeatures: 0.15,
  category: 0.15,
  color: 0.1,
  brand: 0.1,
  uniqueFeatures: 0.1,
  location: 0.07,
  time: 0.03,
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
    const alternateWords = Array.isArray(alternates) ? alternates : [alternates];
    if (alternateWords.some((word) => word && text.includes(word))) return primary;
    if (text.includes(primary)) return primary;
  }

  return text.split(' ')[0] || 'item';
}

function compareCategory(lostItem = {}, foundItem = {}) {
  const left = lostItem.category || getCategoryHint(`${lostItem.description || ''} ${lostItem.item_name || ''}`);
  const right = foundItem.category || getCategoryHint(`${foundItem.description || ''} ${foundItem.item_name || ''}`);

  if (!left || !right) return 0;
  if (left === right) return 100;
  if (left.includes(right) || right.includes(left)) return 80;

  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));
  const overlap = [...leftTokens].filter((token) => rightTokens.has(token));
  return overlap.length ? 50 : 0;
}

function compareOptionalText(leftValue, rightValue) {
  const left = normalizeText(leftValue);
  const right = normalizeText(rightValue);
  if (!left || !right) return null;
  if (left === right) return 100;
  return Math.round(jaccardSimilarity(left, right) * 100);
}

function compareColor(lostItem = {}, foundItem = {}) {
  return compareOptionalText(lostItem.color, foundItem.color);
}

function compareBrand(lostItem = {}, foundItem = {}) {
  return compareOptionalText(lostItem.brand, foundItem.brand);
}

function compareUniqueFeatures(lostItem = {}, foundItem = {}) {
  const left = Array.isArray(lostItem.unique_features) ? lostItem.unique_features : [];
  const right = Array.isArray(foundItem.unique_features) ? foundItem.unique_features : [];
  if (!left.length || !right.length) return null;
  return Math.round(jaccardSimilarity(left.join(' '), right.join(' ')) * 100);
}

function buildMatchingText(item = {}) {
  return [
    item.item_name, item.description, item.visual_description, item.category,
    item.color, item.brand, item.model, item.material, item.size,
    ...(Array.isArray(item.unique_features) ? item.unique_features : []),
  ].filter(Boolean).join(' ');
}

function buildVisualMatchingText(item = {}) {
  return [item.visual_description, item.color, item.brand, item.size, item.material, item.model,
    ...(Array.isArray(item.unique_features) ? item.unique_features : [])].filter(Boolean).join(' ');
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
  if (left.includes(right) || right.includes(left)) {
    return 90;
  }

  return Math.min(95, Math.max(0, base));
}

function coordinateDistanceKm(latA, lngA, latB, lngB) {
  const values = [latA, lngA, latB, lngB].map(Number);
  if (values.some(Number.isNaN)) return null;
  const [aLat, aLng, bLat, bLng] = values.map((value) => value * Math.PI / 180);
  const deltaLat = bLat - aLat;
  const deltaLng = bLng - aLng;
  const haversine = Math.sin(deltaLat / 2) ** 2 + Math.cos(aLat) * Math.cos(bLat) * Math.sin(deltaLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function compareLocationItems(lostItem = {}, foundItem = {}) {
  const distance = coordinateDistanceKm(lostItem.last_seen_lat, lostItem.last_seen_lng, foundItem.found_lat, foundItem.found_lng);
  if (distance !== null) {
    if (distance <= 0.1) return 100;
    if (distance <= 0.5) return 90;
    if (distance <= 1) return 75;
    if (distance <= 3) return 60;
    if (distance <= 5) return 40;
    return 20;
  }
  return compareLocation(lostItem.last_seen_location, foundItem.found_location);
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
  const combinedA = typeof descriptionA === 'object' ? buildMatchingText(descriptionA) : String(descriptionA || '');
  const combinedB = typeof descriptionB === 'object' ? buildMatchingText(descriptionB) : String(descriptionB || '');

  const leftTokens = new Set(tokenize(combinedA));
  const rightTokens = new Set(tokenize(combinedB));
  const sharedTokens = [...leftTokens].filter((token) => rightTokens.has(token));
  const union = new Set([...leftTokens, ...rightTokens]);
  const lexicalScore = union.size === 0 ? 0 : sharedTokens.length / union.size;
  const fallback = Math.min(100, Math.max(0, Math.round((lexicalScore * 100) + (sharedTokens.length * 5))));

  const embeddingA = await getCachedEmbedding(combinedA);
  const embeddingB = await getCachedEmbedding(combinedB);
  if (!embeddingA || !embeddingB) {
    return fallback;
  }

  const cosine = cosineSimilarity(embeddingA, embeddingB);
  const combined = Math.round((lexicalScore * 0.5 + cosine * 0.5) * 100);
  return Math.max(0, Math.min(100, combined));
}

async function computeVisualFeatureScore(lostItem, foundItem) {
  const left = buildVisualMatchingText(lostItem);
  const right = buildVisualMatchingText(foundItem);
  if (!left || !right) return null;
  const leftEmbedding = await getCachedEmbedding(left);
  const rightEmbedding = await getCachedEmbedding(right);
  if (!leftEmbedding || !rightEmbedding) return Math.round(jaccardSimilarity(left, right) * 100);
  return Math.round(cosineSimilarity(leftEmbedding, rightEmbedding) * 100);
}

function buildAiReason(result) {
  const reasons = [];
  if (result.semanticScore >= 80) reasons.push('descriptions are highly similar');
  else if (result.semanticScore >= 65) reasons.push('descriptions share several identifying details');
  if (result.locationScore >= 80) reasons.push('locations are very close');
  else if (result.locationScore >= 50) reasons.push('locations have meaningful overlap');
  if (result.timeScore >= 80) reasons.push('the reports are close in time');
  if (result.categoryScore >= 90) reasons.push('item categories match');

  if (!reasons.length) return 'The reports have limited overlap in item details, location, and timing.';
  return `${result.overallScore >= MATCH_THRESHOLDS.strong ? 'Strong match' : 'Possible match'} because ${reasons.join(', ')}.`;
}

async function scoreLostFoundMatch(lostItem = {}, foundItem = {}, options = {}) {
  const semanticScore = await computeSemanticSimilarity(lostItem, foundItem);
  const visualFeaturesScore = options.visualFeaturesScore ?? await computeVisualFeatureScore(lostItem, foundItem);
  const locationScore = compareLocationItems(lostItem, foundItem);
  const timeScore = compareTime(lostItem.discovered_lost_at || lostItem.created_at, foundItem.found_at || foundItem.created_at);
  const categoryScore = compareCategory(lostItem, foundItem);
  const colorScore = compareColor(lostItem, foundItem);
  const brandScore = compareBrand(lostItem, foundItem);
  const uniqueFeaturesScore = compareUniqueFeatures(lostItem, foundItem);
  const available = { semantic: semanticScore, visualFeatures: visualFeaturesScore, category: categoryScore, color: colorScore, brand: brandScore, uniqueFeatures: uniqueFeaturesScore, location: locationScore, time: timeScore };
  const activeWeight = Object.keys(available).reduce((sum, key) => sum + (available[key] === null ? 0 : MATCHING_WEIGHTS[key]), 0) || 1;

  const overallScore = Math.round(
    Object.entries(available).reduce((sum, [key, score]) => sum + (score === null ? 0 : score * MATCHING_WEIGHTS[key]), 0) / activeWeight
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
    visualFeaturesScore: visualFeaturesScore === null ? null : Math.max(0, Math.min(100, visualFeaturesScore)),
    colorScore: colorScore === null ? null : Math.max(0, Math.min(100, colorScore)),
    brandScore: brandScore === null ? null : Math.max(0, Math.min(100, brandScore)),
    uniqueFeaturesScore: uniqueFeaturesScore === null ? null : Math.max(0, Math.min(100, uniqueFeaturesScore)),
    overallScore,
    matchLevel,
    aiReason: buildAiReason({ semanticScore, locationScore, timeScore, categoryScore, overallScore }),
    aiModel: process.env.AI_MODEL || 'heuristic',
  };
}

module.exports = {
  MATCHING_WEIGHTS,
  MATCH_THRESHOLDS,
  SEMANTIC_MATCH_LEVELS,
  compareCategory,
  compareColor,
  compareBrand,
  compareUniqueFeatures,
  compareLocation,
  compareLocationItems,
  compareTime,
  scoreLostFoundMatch,
  buildMatchingText,
  buildVisualMatchingText,
  computeVisualFeatureScore,
};
