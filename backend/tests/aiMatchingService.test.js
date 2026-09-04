const test = require('node:test');
const assert = require('node:assert/strict');

const { scoreLostFoundMatch, compareLocationItems, SEMANTIC_MATCH_LEVELS, MATCHING_WEIGHTS, buildVisualMatchingText } = require('../services/aiMatchingService');

test('matching weights total one and structured visual text is included', () => {
  assert.equal(Object.values(MATCHING_WEIGHTS).reduce((sum, weight) => sum + weight, 0), 1);
  assert.match(buildVisualMatchingText({ color: 'black', brand: 'Acme', unique_features: ['red zipper'] }), /black Acme red zipper/);
});

test('semantic matching strongly scores close lost and found descriptions', async () => {
  const result = await scoreLostFoundMatch(
    {
      description: 'Black Wildcraft backpack with a red zipper and small white sticker on the front.',
      last_seen_location: 'College Central Library',
      discovered_lost_at: '2026-09-04T10:30:00Z',
    },
    {
      description: 'Found a black Wildcraft college bag with red zip and a white sticker.',
      found_location: 'Near Central Library entrance',
      found_at: '2026-09-04T11:00:00Z',
    }
  );

  assert.ok(result.semanticScore >= 80, `expected semantic score >= 80, got ${result.semanticScore}`);
  assert.ok(result.overallScore >= 80, `expected overall score >= 80, got ${result.overallScore}`);
  assert.ok(result.matchLevel === SEMANTIC_MATCH_LEVELS.STRONG, `expected strong match level, got ${result.matchLevel}`);
});

test('semantic matching gives a low score for unrelated items', async () => {
  const result = await scoreLostFoundMatch(
    {
      description: 'Black Wildcraft backpack with a red zipper and small white sticker on the front.',
      last_seen_location: 'College Central Library',
      discovered_lost_at: '2026-09-04T10:30:00Z',
    },
    {
      description: 'Blue water bottle found in cafeteria',
      found_location: 'Cafeteria',
      found_at: '2026-09-04T12:00:00Z',
    }
  );

  assert.ok(result.overallScore < 65, `expected overall score below 65, got ${result.overallScore}`);
});

test('unknown location remains null', () => {
  assert.equal(compareLocationItems({ description: 'wallet' }, { description: 'wallet' }), null);
});

test('travel path can improve location evidence even when GPS exists', () => {
  const score = compareLocationItems(
    { last_seen_lat: 17.3, last_seen_lng: 78.4, last_seen_location: 'Remote place', travel_path: [{ location: 'Central Library' }] },
    { found_lat: 17.5, found_lng: 78.8, found_location: 'Central Library entrance' }
  );
  assert.equal(score, 90);
});
