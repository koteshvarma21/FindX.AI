const express = require('express');
const {
  getMatchesForLostItem,
  runMatchesForLostItem,
  runMatchesForFoundItem,
  updateMatchStatus,
} = require('../controllers/matchesController');

const router = express.Router();

router.post('/run/:lostItemId', runMatchesForLostItem);
router.get('/lost/:lostItemId', getMatchesForLostItem);
router.post('/run-found/:foundItemId', runMatchesForFoundItem);
router.patch('/:matchId/status', updateMatchStatus);

module.exports = router;
