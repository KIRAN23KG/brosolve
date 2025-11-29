// src/models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['new_message', 'status_change'], required: true },
  complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true },
  message: { type: String, required: false },
  title: String,
  body: String,
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);

