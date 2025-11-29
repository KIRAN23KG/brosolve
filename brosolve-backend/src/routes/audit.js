// src/routes/audit.js
const express = require('express');
const AuditLog = require('../models/AuditLog');
const { auth } = require('../middleware/auth');
const { isAdmin } = require('../middleware/role');

const router = express.Router();

// GET /api/audit/logs - Get audit logs (admin/superadmin only)
router.get('/logs', auth, isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    let filter = {};
    
    // Filter by action
    if (req.query.action) {
      filter.action = req.query.action;
    }
    
    // Filter by entity type
    if (req.query.entityType) {
      filter.entityType = req.query.entityType;
    }
    
    // Filter by user
    if (req.query.userId) {
      filter.performedBy = req.query.userId;
    }
    
    const logs = await AuditLog.find(filter)
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await AuditLog.countDocuments(filter);
    
    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching audit logs', error: err.message });
  }
});

module.exports = router;

