const express = require('express');
const { followUpQuestion, aiHealth } = require('../controllers/aiController');

const router = express.Router();

router.post('/follow-up', followUpQuestion);
router.get('/health', aiHealth);

module.exports = router;
