const express = require('express');

const {
  createFoundItem,
  getFoundItems,
  getFoundItemById
} = require('../controllers/foundItemsController');

const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { validateFoundItem } = require('../middleware/validateFoundItem');

router.post('/', requireAuth, validateFoundItem, createFoundItem);

router.get('/', getFoundItems);

router.get('/:id', getFoundItemById);

module.exports = router;
