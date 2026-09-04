const express = require('express');
const { followUpQuestion, aiHealth, analyzeLostImage } = require('../controllers/aiController');

const router = express.Router();
const { requireAuth } = require('../middleware/auth');

router.post('/follow-up', requireAuth, followUpQuestion);
router.get('/health', aiHealth);
router.post('/analyze-image', requireAuth, analyzeLostImage);

module.exports = router;
