// controllers/lostItemsController.js
const User = require('../models/User');
const LostItem = require('../models/LostItem');
const GeneratedImage = require('../models/GeneratedImage');
const { runMatchingForLostItem } = require('./matchesController');

// POST /api/lost-items
// (validation already ran in middleware/validateLostItem.js before this fires)
async function createLostItem(req, res) {
  const body = req.body;

  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ success: false, errors: ['Authenticated user not found.'] });

    let generatedImage;
    if (body.generated_image) {
      if (!require('mongoose').isValidObjectId(body.generated_image)) {
        return res.status(400).json({ success: false, errors: ['generated_image must be a valid ID.'] });
      }
      generatedImage = await GeneratedImage.findOne({ _id: body.generated_image, user: req.userId, confirmed: true });
      if (!generatedImage) return res.status(403).json({ success: false, errors: ['Generated image is not owned by this user or is not confirmed.'] });
    }

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
      ai_generated_image_url: generatedImage?.imageUrl,
      generated_image: generatedImage?._id,
      user_confidence_score: generatedImage?.accuracy,
      last_seen_location: body.last_seen_location,
      last_seen_lat: body.last_seen_lat,
      last_seen_lng: body.last_seen_lng,
      last_seen_at: body.last_seen_at || undefined,
      discovered_lost_at: body.discovered_lost_at,
      travel_path: body.travel_path || [],
      contact_email: user.email,
    });

    let matchingResults = [];
    let matchingStatus = 'completed';
    try {
      matchingResults = await runMatchingForLostItem(lostItem._id);
    } catch (matchingError) {
      matchingStatus = 'failed';
      console.error('Lost-item matching failed after save:', matchingError.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Report submitted successfully.',
      data: {
        lost_id: lostItem._id,
        lostItemId: lostItem._id,
        status: lostItem.status,
        created_at: lostItem.created_at,
        matches: matchingResults,
        matchingStatus,
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
    const filter = { status: status || 'active' };
    const items = await LostItem.find(filter).select('_id item_name description category color brand original_image_url ai_generated_image_url last_seen_location status created_at').sort({ created_at: -1 });
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
    const item = await LostItem.findById(id).select('_id item_name description category color brand original_image_url ai_generated_image_url last_seen_location status created_at');
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
