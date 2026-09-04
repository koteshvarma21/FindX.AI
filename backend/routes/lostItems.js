// routes/lostItems.js
const express = require('express');
const router = express.Router();
const { validateLostItem } = require('../middleware/validateLostItem');
const {
  createLostItem,
  getLostItems,
  getLostItemById,
} = require('../controllers/lostItemsController');

router.post('/', validateLostItem, createLostItem); // POST   /api/lost-items
router.get('/', getLostItems);                       // GET    /api/lost-items?status=active
router.get('/:id', getLostItemById);                 // GET    /api/lost-items/:id

module.exports = router;
