// src/models/Category.js
const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true }, // soft-delete support
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
}, { timestamps: true });

module.exports = mongoose.model('Category', CategorySchema);

