const { getFollowUpQuestion } = require('../services/aiService');

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

module.exports = { followUpQuestion };
