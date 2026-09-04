const { getFollowUpQuestion, checkAIHealth, AI_MODEL, AI_EMBEDDING_MODEL } = require('../services/aiService');

async function followUpQuestion(req, res) {
  try {
    const { originalDescription, conversation = [] } = req.body || {};

    if (!originalDescription || !String(originalDescription).trim()) {
      return res.status(400).json({
        success: false,
        message: 'originalDescription is required',
      });
    }

    const result = await getFollowUpQuestion({
      originalDescription: String(originalDescription),
      conversation,
    });

    return res.json({
      success: true,
      question: result.question,
      extractedDetails: result.extractedDetails || {},
      usedFallback: Boolean(result.usedFallback),
    });
  } catch (error) {
    console.error('AI follow-up question error:', error);
    return res.status(500).json({
      success: false,
      message: 'AI follow-up failed, using a safe fallback question.',
    });
  }
}

async function aiHealth(req, res) {
  try {
    const result = await checkAIHealth();
    return res.status(result.success ? 200 : 503).json(result);
  } catch (error) {
    console.error('AI health check error:', error.message);
    return res.status(503).json({
      success: false,
      provider: 'Featherless',
      chatModel: AI_MODEL,
      embeddingModel: AI_EMBEDDING_MODEL,
      chatWorking: false,
      embeddingsWorking: false,
      message: 'Featherless API request failed',
    });
  }
}

module.exports = { followUpQuestion, aiHealth };
