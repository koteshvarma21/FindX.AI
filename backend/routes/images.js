const express = require('express');
const OpenAI = require('openai');
const GeneratedImage = require('../models/GeneratedImage');
const { optionalAuth } = require('../middleware/auth');
const { storeDataUrl } = require('../services/imageStorage');

const router = express.Router();

function buildPrompt(description, improvements = []) {
  let prompt = `Generate a clear, realistic photo of a lost item based on this description: "${description}".`;
  if (improvements.length) prompt += ` Apply these corrections based on user feedback: ${improvements.join('; ')}.`;
  return prompt;
}

router.post('/generate', optionalAuth, async (req, res) => {
  try {
    const { description, improvements = [] } = req.body;
    if (!description || !description.trim()) return res.status(400).json({ message: 'description is required' });
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = buildPrompt(description, improvements);
    const result = await openai.images.generate({ model: 'gpt-image-1', prompt, size: '1024x1024' });
    const imageUrl = await storeDataUrl(`data:image/png;base64,${result.data[0].b64_json}`);
    res.json({ imageUrl, promptUsed: prompt });
  } catch (err) {
    console.error('Image generation error:', err);
    res.status(500).json({ message: 'Failed to generate image' });
  }
});

router.post('/upload', optionalAuth, async (req, res) => {
  try {
    const imageUrl = await storeDataUrl(req.body?.image);
    if (!imageUrl || imageUrl === req.body?.image) return res.status(400).json({ message: 'A valid image data URL is required' });
    return res.json({ imageUrl });
  } catch (error) {
    console.error('Image upload error:', error.message);
    return res.status(500).json({ message: 'Failed to store image' });
  }
});

router.post('/confirm', optionalAuth, async (req, res) => {
  try {
    const { description, improvements = [], imageUrl, accuracy } = req.body;
    if (!description || !imageUrl || accuracy === undefined) {
      return res.status(400).json({ message: 'description, imageUrl, and accuracy are required' });
    }
    if (Number(accuracy) < 60) return res.status(400).json({ message: 'Accuracy must be at least 60 to confirm the image.' });
    const storedImageUrl = await storeDataUrl(imageUrl);
    const record = await GeneratedImage.create({
      user: req.userId,
      description,
      improvements,
      imageUrl: storedImageUrl,
      accuracy,
      confirmed: true,
    });
    res.status(201).json({ message: 'Image confirmed and saved', generatedImageId: record._id, imageUrl: storedImageUrl, record });
  } catch (err) {
    console.error('Confirm image error:', err);
    res.status(500).json({ message: 'Failed to save confirmed image' });
  }
});

module.exports = router;