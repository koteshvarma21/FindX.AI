// models/Match.js
// The core linking record: written by the AI matching / CCTV module whenever
// it thinks a lost item and a found item (or a CCTV sighting) are the same thing.

const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    lost_item: { type: mongoose.Schema.Types.ObjectId, ref: 'LostItem', required: true },
    found_item: { type: mongoose.Schema.Types.ObjectId, ref: 'FoundItem', default: null },
    match_source: { type: String, enum: ['found_page', 'cctv', 'manual'], default: 'found_page' },
    image_similarity_score: { type: Number, min: 0, max: 100, default: null },
    semantic_score: { type: Number, min: 0, max: 100, default: 0 },
    location_score: { type: Number, min: 0, max: 100, default: 0 },
    time_score: { type: Number, min: 0, max: 100, default: 0 },
    category_score: { type: Number, min: 0, max: 100, default: 0 },
    color_score: { type: Number, min: 0, max: 100, default: null },
    brand_score: { type: Number, min: 0, max: 100, default: null },
    unique_features_score: { type: Number, min: 0, max: 100, default: null },
    overall_score: { type: Number, min: 0, max: 100, default: 0 },
    ai_reason: { type: String, trim: true },
    ai_model: { type: String, trim: true },
    cctv_footage_ref: { type: String, trim: true },
    match_status: {
      type: String,
      enum: ['pending', 'notified', 'confirmed', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: { createdAt: 'matched_at', updatedAt: 'updated_at' } }
);

matchSchema.index({ lost_item: 1, found_item: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Match', matchSchema);
