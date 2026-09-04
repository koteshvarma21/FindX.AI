const express = require('express');
const {
  getMatchesForLostItem,
  runMatchesForLostItem,
  runMatchesForFoundItem,
  updateMatchStatus,
} = require('../controllers/matchesController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/run/:lostItemId', requireAuth, runMatchesForLostItem);
router.get('/lost/:lostItemId', requireAuth, getMatchesForLostItem);
router.post('/run-found/:foundItemId', runMatchesForFoundItem);
router.patch('/:matchId/status', requireAuth, updateMatchStatus);

module.exports = router;
