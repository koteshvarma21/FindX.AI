const express = require('express');
const { followUpQuestion } = require('../controllers/aiController');

const router = express.Router();

router.post('/follow-up', followUpQuestion);

module.exports = router;
