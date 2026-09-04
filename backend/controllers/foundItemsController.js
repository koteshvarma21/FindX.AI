const User = require('../models/User');
const FoundItem = require('../models/FoundItem');

async function findOrCreateUser(email, name) {
  let user = await User.findOne({
    email: email.toLowerCase()
  });

  if (!user) {
    user = await User.create({
      email: email.toLowerCase(),
      name: name || 'Reporter',
      fullName: name || 'Reporter',
      role: 'reporter'
    });
  }

  return user._id;
}

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
      !found_location ||
      !contact_email
    ) {
      return res.status(400).json({
        success: false,
        message:
          'item_name, description, found_location and contact_email are required'
      });
    }

    const userId = await findOrCreateUser(
      contact_email,
      reporter_name
    );

    const item = await FoundItem.create({
      user: userId,
      item_name,
      description,
      found_location,
      found_at: found_at || undefined,
      contact_email,
      image_url: image_url || undefined
    });

    res.status(201).json({
      success: true,
      message: 'Found item submitted successfully',
      data: item
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
    const items = await FoundItem
      .find()
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
      await FoundItem.findById(req.params.id);

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