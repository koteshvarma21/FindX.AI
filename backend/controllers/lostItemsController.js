// controllers/lostItemsController.js
const User = require('../models/User');
const LostItem = require('../models/LostItem');
const { runMatchingForLostItem } = require('./matchesController');

// Finds a user by email, or creates one on the fly.
// This project has no login system yet, so the reporter's email doubles as their identity.
// findOneAndUpdate + upsert does this atomically in one round trip to MongoDB.
async function findOrCreateUserByEmail(email, name) {
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { $setOnInsert: { email: email.toLowerCase(), name: name || undefined, role: 'reporter' } },
    { upsert: true, new: true }
  );
  return user._id;
}

// POST /api/lost-items
// (validation already ran in middleware/validateLostItem.js before this fires)
async function createLostItem(req, res) {
  const body = req.body;

  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ success: false, errors: ['Authenticated user not found.'] });

    const lostItem = await LostItem.create({
      user: req.userId,
      description: body.description || undefined,
      item_name: body.item_name || undefined,
      category: body.category || undefined,
      color: body.color || undefined,
      brand: body.brand || undefined,
      size: body.size || undefined,
      material: body.material || undefined,
      model: body.model || undefined,
      unique_features: body.unique_features || [],
      visual_description: body.visual_description || undefined,
      original_image_url: body.original_image_url || undefined,
      ai_generated_image_url: body.ai_generated_image_url || undefined,
      generated_image: body.generated_image || undefined,
      user_confidence_score: body.user_confidence_score,
      last_seen_location: body.last_seen_location,
      last_seen_lat: body.last_seen_lat,
      last_seen_lng: body.last_seen_lng,
      discovered_lost_at: body.discovered_lost_at,
      travel_path: body.travel_path || [],
      contact_email: user.email,
    });

    const matchingResults = await runMatchingForLostItem(lostItem._id);

    return res.status(201).json({
      success: true,
      message: 'Report submitted successfully.',
      data: {
        lost_id: lostItem._id,
        lostItemId: lostItem._id,
        status: lostItem.status,
        created_at: lostItem.created_at,
        matches: matchingResults,
      },
    });
  } catch (err) {
    console.error('Error creating lost item:', err);
    return res.status(500).json({
      success: false,
      errors: ['Something went wrong while saving your report. Please try again.'],
    });
  }
}

// GET /api/lost-items?status=active
// Useful for the matching/CCTV teammate to pull the active queue.
async function getLostItems(req, res) {
  const { status } = req.query;
  try {
    const filter = status ? { status } : {};
    const items = await LostItem.find(filter).sort({ created_at: -1 });
    return res.json({ success: true, data: items });
  } catch (err) {
    console.error('Error fetching lost items:', err);
    return res.status(500).json({ success: false, errors: ['Failed to fetch lost items.'] });
  }
}

// GET /api/lost-items/:id
async function getLostItemById(req, res) {
  const { id } = req.params;
  try {
    const item = await LostItem.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, errors: ['Lost item not found.'] });
    }
    return res.json({ success: true, data: item });
  } catch (err) {
    // Mongoose throws a CastError for a malformed ObjectId — treat that as "not found" too.
    if (err.name === 'CastError') {
      return res.status(404).json({ success: false, errors: ['Lost item not found.'] });
    }
    console.error('Error fetching lost item:', err);
    return res.status(500).json({ success: false, errors: ['Failed to fetch lost item.'] });
  }
}

module.exports = { createLostItem, getLostItems, getLostItemById };
