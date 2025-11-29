// src/models/AuditLog.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const auditLogSchema = new Schema({
  action: { type: String, required: true }, // 'create', 'reply', 'solve', 'assign', 'export'
  entityType: { type: String, required: true }, // 'complaint', 'reply', etc.
  entityId: { type: Schema.Types.ObjectId, required: true },
  performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  details: { type: Schema.Types.Mixed }, // Additional context
  ipAddress: String,
  userAgent: String
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);

