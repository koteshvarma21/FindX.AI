// models/MailLog.js
// Audit trail of every email sent, and the guard against double-sending the
// same notification if the matching job re-runs.

const mongoose = require('mongoose');

const mailLogSchema = new mongoose.Schema(
  {
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null },
    lost_item: { type: mongoose.Schema.Types.ObjectId, ref: 'LostItem', default: null },
    found_item: { type: mongoose.Schema.Types.ObjectId, ref: 'FoundItem', default: null },
    recipient_email: { type: String, required: true, trim: true, lowercase: true },
    mail_type: {
      type: String,
      enum: ['match_found', 'security_alert', 'confirmation_request', 'handover_confirmed'],
      required: true,
    },
    status: { type: String, enum: ['queued', 'sent', 'failed'], default: 'queued' },
    sent_at: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

module.exports = mongoose.model('MailLog', mailLogSchema);
