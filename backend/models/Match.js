// models/Match.js
// The core linking record: written by the AI matching / CCTV module whenever
// it thinks a lost item and a found item (or a CCTV sighting) are the same thing.

const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    lost_item: { type: mongoose.Schema.Types.ObjectId, ref: 'LostItem', required: true },
    found_item: { type: mongoose.Schema.Types.ObjectId, ref: 'FoundItem', default: null }, // null if matched via CCTV only
    match_source: { type: String, enum: ['found_page', 'cctv'], required: true },
    image_similarity_score: { type: Number, min: 0, max: 100 },
    cctv_footage_ref: { type: String, trim: true }, // pointer/id into the CCTV module's storage
    match_status: {
      type: String,
      enum: ['pending', 'notified', 'confirmed', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: { createdAt: 'matched_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('Match', matchSchema);
