// src/routes/exports.js
const express = require('express');
const Complaint = require('../models/Complaint');
const AuditLog = require('../models/AuditLog');
const { auth } = require('../middleware/auth');
const { isAdmin } = require('../middleware/role');

const router = express.Router();

// Helper: Create audit log
async function createAuditLog(action, entityType, entityId, userId, details = {}) {
  try {
    await AuditLog.create({
      action,
      entityType,
      entityId,
      performedBy: userId,
      details,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

// GET /api/exports/complaints - Export complaints to Excel
router.get('/complaints', auth, isAdmin, async (req, res) => {
  try {
    const complaints = await Complaint.find({})
      .populate('raisedBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });
    
    // Simple CSV export (can be enhanced with xlsx library)
    const headers = ['ID', 'Title', 'Category', 'Status', 'Center Type', 'Raised By', 'Assigned To', 'Created At'];
    const rows = complaints.map(c => [
      c._id.toString(),
      c.title || '',
      c.category || '',
      c.status || '',
      c.centerType || '',
      c.raisedBy?.name || '',
      c.assignedTo?.name || '',
      c.createdAt?.toISOString() || ''
    ]);
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    // Audit log
    await createAuditLog('export', 'complaint', null, req.user.id, {
      format: 'csv',
      count: complaints.length,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="complaints-${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ message: 'Error exporting complaints', error: err.message });
  }
});

module.exports = router;

