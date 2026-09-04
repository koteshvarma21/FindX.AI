const test = require('node:test');
const assert = require('node:assert/strict');

const { extractKnownFacts, getFollowUpQuestion, toConversationText } = require('../services/aiService');

test('conversation parsing includes role and content', () => {
  assert.equal(toConversationText([{ role: 'assistant', content: 'Any marks?' }, { role: 'user', content: 'A red zipper' }]), 'assistant: Any marks?\nuser: A red zipper');
});

test('fallback extraction preserves known structured facts', async () => {
  const result = await getFollowUpQuestion({
    originalDescription: 'Black Wildcraft backpack',
    conversation: [{ role: 'user', content: 'It has a red zipper' }],
  });
  assert.equal(result.extractedDetails.category, 'backpack');
  assert.equal(result.extractedDetails.color, 'black');
  assert.equal(result.extractedDetails.brand, 'wildcraft');
  assert.equal(result.extractedDetails.uniqueFeatures.includes('zipper'), true);
  assert.equal(typeof result.readyToGenerate, 'boolean');
});

test('vision configuration is required instead of fabricating analysis', async () => {
  const { analyzeImage } = require('../services/aiService');
  await assert.rejects(() => analyzeImage('data:image/png;base64,invalid'), /AI_API_KEY|AI_VISION_MODEL|Vision/);
});
