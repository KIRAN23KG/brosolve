// src/routes/replies.js
const express = require('express');
const Reply = require('../models/Reply');
const Complaint = require('../models/Complaint');
const AuditLog = require('../models/AuditLog');
const { upload, audioUpload } = require('../utils/upload');
const { auth } = require('../middleware/auth');
const { permit } = require('../middleware/role');

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

// POST /api/replies/complaint/:id - Create reply to complaint
router.post('/complaint/:id', auth, upload.any(), async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    
    // Check permissions: student can only reply to own complaints, staff/admin can reply to any
    if (req.user.role === 'student' && complaint.raisedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only reply to your own complaints' });
    }
    
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Reply text is required' });
    
    // Handle file uploads
    const files = req.files || [];
    const limitedFiles = files.slice(0, 3);
    const attachments = limitedFiles.map(f => ({
      filename: f.filename,
      url: `/uploads/${f.filename}`,
      mimetype: f.mimetype
    }));
    
    const reply = new Reply({
      complaintId: req.params.id,
      text,
      by: req.user.id,
      attachments
    });
    
    await reply.save();
    
    // Also add to complaint.replies for backward compatibility
    complaint.replies.push({
      text,
      by: req.user.id,
      createdAt: new Date()
    });
    await complaint.save();
    
    // Audit log
    await createAuditLog('reply', 'reply', reply._id, req.user.id, {
      complaintId: req.params.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    const populatedReply = await Reply.findById(reply._id)
      .populate('by', 'name email')
      .populate('complaintId', 'title');
    
    res.status(201).json({ message: 'Reply added', reply: populatedReply });
  } catch (err) {
    res.status(500).json({ message: 'Error adding reply', error: err.message });
  }
});

router.post(
  "/complaint/:id/audio",
  auth,
  (req, res, next) => {
    audioUpload.single("audio")(req, res, (err) => {
      if (err) {
        return res
          .status(400)
          .json({ message: err.message || "Invalid audio file" });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const complaint = await Complaint.findById(req.params.id);
      if (!complaint)
        return res.status(404).json({ message: "Complaint not found" });

      // Authorization check
      const isStudent = req.user.role === 'student';
      const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

      // Normalize IDs before comparison
      const complaintOwner = complaint.raisedBy?._id?.toString() || complaint.raisedBy?.toString();
      const currentUser = req.user.id?.toString();

      if (isStudent && complaintOwner !== currentUser) {
        return res.status(403).json({ message: 'You can only message your own complaints' });
      }

      if (!isStudent && !isAdmin) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'Audio file required' });
      }

      // Determine sender type CORRECTLY
      let sender = "";
      if (req.user.role === "student") {
        sender = "student";
      } else if (req.user.role === "admin" || req.user.role === "superadmin") {
        sender = "admin";
      } else {
        return res.status(403).json({ message: "Invalid sender role" });
      }

      const audioUrl = `/uploads/audio/${req.file.filename}`;

      // Create Reply document (does NOT require message field)
      const reply = await Reply.create({
        complaintId: complaint._id,
        by: req.user.id,
        attachments: [
          {
            url: audioUrl,
            filename: req.file.filename,
            mimetype: req.file.mimetype,
          },
        ],
      });

      return res.status(201).json({
        success: true,
        reply
      });
    } catch (err) {
      return res
        .status(500)
        .json({ message: "Error saving voice reply", error: err.message });
    }
  }
);

// GET /api/replies/complaint/:id - Get all replies for a complaint
router.get('/complaint/:id', auth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    
    // Check permissions
    if (req.user.role === 'student' && complaint.raisedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const replies = await Reply.find({ complaintId: req.params.id })
      .populate('by', 'name email role')
      .sort({ createdAt: 1 });
    
    res.json({ replies });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching replies', error: err.message });
  }
});

module.exports = router;

