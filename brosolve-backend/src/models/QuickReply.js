// src/models/QuickReply.js
const mongoose = require('mongoose');

const quickReplySchema = new mongoose.Schema({
  label: { type: String, required: true },
  text: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scope: { type: String, enum: ['global', 'personal'], default: 'global' }
}, { timestamps: true });

module.exports = mongoose.model('QuickReply', quickReplySchema);

