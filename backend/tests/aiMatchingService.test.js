const test = require('node:test');
const assert = require('node:assert/strict');

const { scoreLostFoundMatch, SEMANTIC_MATCH_LEVELS } = require('../services/aiMatchingService');

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
