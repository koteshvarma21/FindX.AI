// models/LostItem.js
// A report filed on the "Search Item" page — either an uploaded image or a
// description (which the AI turns into a generated image + confidence check),
// plus where/when it was last seen and the traveled path leading up to that.

const mongoose = require('mongoose');

const travelStopSchema = new mongoose.Schema(
  {
    location: { type: String, required: true },
    time: { type: Date },
  },
  { _id: false }
);

const lostItemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, trim: true },
    item_name: { type: String, trim: true },
    category: { type: String, trim: true },
    color: { type: String, trim: true },
    brand: { type: String, trim: true },
    size: { type: String, trim: true },
    material: { type: String, trim: true },
    model: { type: String, trim: true },
    unique_features: [{ type: String, trim: true }],
    visual_description: { type: String, trim: true },
    original_image_url: { type: String, trim: true },
    ai_generated_image_url: { type: String, trim: true },
    generated_image: { type: mongoose.Schema.Types.ObjectId, ref: 'GeneratedImage' },
    user_confidence_score: { type: Number, min: 0, max: 100 }, // self-rated % match to the AI-generated image
    last_seen_location: { type: String, required: true, trim: true },
    last_seen_lat: { type: Number, min: -90, max: 90 },
    last_seen_lng: { type: Number, min: -180, max: 180 },
    discovered_lost_at: { type: Date }, // when the user realized it was missing
    travel_path: [travelStopSchema], // ordered waypoints with timestamps
    contact_email: { type: String, required: true, trim: true, lowercase: true },
    status: {
      type: String,
      enum: ['active', 'matched_pending', 'resolved', 'withdrawn'],
      default: 'active',
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('LostItem', lostItemSchema);
