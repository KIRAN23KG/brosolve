// src/models/Complaint.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const attachmentSchema = new Schema({
  filename: String,
  url: String,
  mimetype: String
});

const reactionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  emoji: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const messageSchema = new Schema({
  sender: { type: String, enum: ['student', 'admin'], required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['text', 'audio'], default: 'text' },
  audioUrl: String,
  createdAt: { type: Date, default: Date.now },
  attachments: [String],
  reactions: [reactionSchema],
  seenByAdmin: { type: Boolean, default: false },
  seenByStudent: { type: Boolean, default: false }
}, { _id: true });

const complaintSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  category: { type: String, required: true },
  centerType: { type: String, enum: ['online', 'brocamp', 'hybrid', 'other'], required: true },
  contactPreference: { type: String, enum: ['call','whatsapp','email','in_web'], default: 'in_web' },
  allowWebReply: { type: Boolean, default: true },
  status: { type: String, enum: ['open','in_review','resolved','closed'], default: 'open' },
  ratingScore: { type: Number, min: 1, max: 5 },
  ratingComment: { type: String },
  ratedAt: { type: Date },
  attachments: [attachmentSchema],
  raisedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  replies: [{
    text: String,
    by: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  messages: [messageSchema]
}, { timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);
