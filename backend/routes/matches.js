const express = require('express');
const {
  getMatchesForLostItem,
  runMatchesForLostItem,
  runMatchesForFoundItem,
} = require('../controllers/matchesController');

const router = express.Router();

router.post('/run/:lostItemId', runMatchesForLostItem);
router.get('/lost/:lostItemId', getMatchesForLostItem);
router.post('/run-found/:foundItemId', runMatchesForFoundItem);

module.exports = router;
