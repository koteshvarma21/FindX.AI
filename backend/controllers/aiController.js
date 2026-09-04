const { getFollowUpQuestion, checkAIHealth, analyzeImage, AI_MODEL, AI_EMBEDDING_MODEL } = require('../services/aiService');

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
      readyToGenerate: Boolean(result.readyToGenerate),
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

async function analyzeLostImage(req, res) {
  try {
    const { image } = req.body || {};
    if (!image || !String(image).startsWith('data:image/')) {
      return res.status(400).json({ success: false, message: 'image must be a data URL' });
    }
    const extractedDetails = await analyzeImage(image);
    return res.json({ success: true, extractedDetails });
  } catch (error) {
    console.error('AI image analysis error:', error.message);
    return res.status(503).json({ success: false, message: error.message || 'Image analysis is unavailable' });
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

module.exports = { followUpQuestion, aiHealth, analyzeLostImage };
