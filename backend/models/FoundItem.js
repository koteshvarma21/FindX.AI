const mongoose = require('mongoose');

const foundItemSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    item_name: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      required: true,
      trim: true
    },

    image_url: {
      type: String,
      trim: true
    },

    found_location: {
      type: String,
      required: true,
      trim: true
    },

    found_lat: {
      type: Number,
      min: -90,
      max: 90
    },

    found_lng: {
      type: Number,
      min: -180,
      max: 180
    },

    found_at: {
      type: Date
    },

    handover_type: {
      type: String,
      enum: ['self_handoff', 'security']
    },

    contact_email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },

    status: {
      type: String,
      enum: ['active', 'matched_pending', 'resolved'],
      default: 'active'
    }
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
);

module.exports = mongoose.model('FoundItem', foundItemSchema);