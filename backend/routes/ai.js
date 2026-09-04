const express = require('express');
const { followUpQuestion, aiHealth, analyzeLostImage } = require('../controllers/aiController');

const router = express.Router();

router.post('/follow-up', followUpQuestion);
router.get('/health', aiHealth);
router.post('/analyze-image', analyzeLostImage);

module.exports = router;
