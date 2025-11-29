// src/models/Reply.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const attachmentSchema = new Schema({
  filename: String,
  url: String,
  mimetype: String
});

const replySchema = new Schema({
  complaintId: { type: Schema.Types.ObjectId, ref: 'Complaint', required: true },
  text: { type: String, required: false }, // Allow null for audio-only messages
  by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  attachments: [attachmentSchema]
}, { timestamps: true });

module.exports = mongoose.model('Reply', replySchema);

