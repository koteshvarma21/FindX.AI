const express = require('express');

const {
  createFoundItem,
  getFoundItems,
  getFoundItemById
} = require('../controllers/foundItemsController');

const router = express.Router();

router.post('/', createFoundItem);

router.get('/', getFoundItems);

router.get('/:id', getFoundItemById);

module.exports = router;
