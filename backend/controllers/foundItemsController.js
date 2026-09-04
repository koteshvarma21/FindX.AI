const User = require('../models/User');
const FoundItem = require('../models/FoundItem');
const { runMatchingForFoundItem } = require('./matchesController');

async function createFoundItem(req, res) {
  try {
    const {
      item_name,
      description,
      found_location,
      found_at,
      contact_email,
      reporter_name,
      image_url
    } = req.body;

    if (
      !item_name ||
      !description ||
      !found_location
    ) {
      return res.status(400).json({
        success: false,
        message:
          'item_name, description and found_location are required'
      });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ success: false, message: 'Authenticated user not found' });

    const item = await FoundItem.create({
      user: req.userId,
      item_name,
      description,
      category: req.body.category || undefined,
      color: req.body.color || undefined,
      brand: req.body.brand || undefined,
      size: req.body.size || undefined,
      material: req.body.material || undefined,
      model: req.body.model || undefined,
      unique_features: req.body.unique_features || [],
      visual_description: req.body.visual_description || undefined,
      found_location,
      found_at: found_at || undefined,
      contact_email: user.email,
      image_url: image_url || undefined,
      found_lat: req.body.found_lat,
      found_lng: req.body.found_lng,
    });

    let matches = [];
    let matchingStatus = 'completed';
    try {
      matches = await runMatchingForFoundItem(item._id);
    } catch (matchingError) {
      matchingStatus = 'failed';
      console.error('Found-item matching failed after save:', matchingError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Found item submitted successfully',
      data: {
        ...item.toObject(),
        matches,
        matchingStatus,
      }
    });

  } catch (error) {
    console.error('Create found item error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to save found item'
    });
  }
}

async function getFoundItems(req, res) {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const items = await FoundItem
      .find(filter)
      .select('_id item_name description category color brand image_url found_location found_at status created_at')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      data: items
    });

  } catch (error) {
    console.error('Get found items error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch found items'
    });
  }
}

async function getFoundItemById(req, res) {
  try {
    const item =
      await FoundItem.findById(req.params.id).select('_id item_name description category color brand image_url found_location found_at status created_at');

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Found item not found'
      });
    }

    res.json({
      success: true,
      data: item
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch found item'
    });
  }
}

module.exports = {
  createFoundItem,
  getFoundItems,
  getFoundItemById
};