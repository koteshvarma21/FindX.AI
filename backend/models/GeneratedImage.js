const mongoose = require('mongoose');

const generatedImageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, required: true },
    improvements: [{ type: String }],
    imageUrl: { type: String, required: true },
    accuracy: { type: Number, min: 0, max: 100, required: true },
    confirmed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GeneratedImage', generatedImageSchema);