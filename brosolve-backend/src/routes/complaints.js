// src/routes/complaints.js
const express = require('express');
const Complaint = require('../models/Complaint');
const Category = require('../models/Category');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Reply = require('../models/Reply');
const { upload, audioUpload } = require('../utils/upload');
const { auth } = require('../middleware/auth');
const { permit } = require('../middleware/role');
const { notifyComplaintCreated, notifyComplaintSolved } = require('../services/notifications');
const { getTyping, updateTyping } = require('../services/typing');

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

// 1️⃣ Raise complaint (Student)
router.post('/', auth, upload.any(), async (req, res) => {
  try {
    // Map frontend field names to backend model
    const { 
      title, 
      description, 
      category, 
      centerType, 
      contactPreference,
      contactMethod,  // Frontend sends this
      allowWebReply,
      replyInWeb  // Frontend sends this
    } = req.body;

    // Validation
    if (!category || !description) {
      return res.status(400).json({ message: 'Category and description are required' });
    }

    // Validate category exists and is active
    // Helper: slugify (same as in categories.js)
    const slugify = (s) => {
      return s.toString().trim().toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
    };
    
    const categoryExists = await Category.findOne({
      $or: [
        { slug: slugify(category) },
        { name: category.trim() }
      ],
      isActive: true
    });
    
    if (!categoryExists) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    // Map field names
    const finalContactPreference = contactPreference || contactMethod || 'in_web';
    const finalAllowWebReply = allowWebReply !== undefined ? allowWebReply : (replyInWeb !== undefined ? replyInWeb : true);
    const finalTitle = title || `${category} Complaint`;
    const finalCenterType = centerType || 'online';

    // Handle file uploads (support any field name: 'file', 'attachments', etc.)
    const files = req.files || [];
    // Limit to 3 files max
    const limitedFiles = files.slice(0, 3);
    const attachments = limitedFiles.map(f => ({
      filename: f.filename,
      url: `/uploads/${f.filename}`,
      mimetype: f.mimetype
    }));

    const complaint = new Complaint({
      title: finalTitle,
      description,
      category,
      centerType: finalCenterType,
      contactPreference: finalContactPreference,
      allowWebReply: finalAllowWebReply,
      raisedBy: req.user.id,
      attachments
    });

    await complaint.save();
    
    // Audit log
    await createAuditLog('create', 'complaint', complaint._id, req.user.id, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    // Notifications (silently fail if config missing)
    try {
      const user = await User.findById(req.user.id);
      if (user) {
        await notifyComplaintCreated(complaint, user);
      }
    } catch (notifErr) {
      console.error('Notification error:', notifErr.message);
    }
    
    res.status(201).json({ message: 'Complaint submitted ✅', complaint });
  } catch (err) {
    res.status(500).json({ message: 'Error submitting complaint', error: err.message });
  }
});

// 2️⃣ List mine / all with filtering, search, pagination
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Base filter
    let filter = req.user.role === 'student'
      ? { raisedBy: req.user.id }
      : {};
    
    // Category filter
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    // Status filter
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Center type filter
    if (req.query.centerType) {
      filter.centerType = req.query.centerType;
    }
    
    // Date range filter
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) {
        filter.createdAt.$gte = new Date(req.query.from);
      }
      if (req.query.to) {
        filter.createdAt.$lte = new Date(req.query.to);
      }
    }
    
    // Search query (search in title, description, category)
    if (req.query.q) {
      filter.$or = [
        { title: { $regex: req.query.q, $options: 'i' } },
        { description: { $regex: req.query.q, $options: 'i' } },
        { category: { $regex: req.query.q, $options: 'i' } }
      ];
    }
    
    const complaints = await Complaint.find(filter)
      .populate('raisedBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Complaint.countDocuments(filter);
    
    res.json({
      complaints,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching complaints', error: err.message });
  }
});

// 3️⃣ Add admin reply (deprecated - use /api/replies/complaint/:id instead)
router.post('/:id/reply', auth, permit('admin','superadmin'), async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Not found' });
    complaint.replies.push({ text: req.body.text, by: req.user.id });
    await complaint.save();
    
    // Audit log
    await createAuditLog('reply', 'complaint', complaint._id, req.user.id, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.json({ message: 'Reply added', complaint });
  } catch (err) {
    res.status(500).json({ message: 'Error adding reply', error: err.message });
  }
});

// 4️⃣ Mark complaint solved
router.patch('/:id/solve', auth, permit('admin','superadmin'), async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Not found' });
    complaint.status = 'resolved';
    complaint.assignedTo = req.user.id;
    await complaint.save();
    
    // Audit log
    await createAuditLog('solve', 'complaint', complaint._id, req.user.id, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    // Notifications
    try {
      const user = await User.findById(complaint.raisedBy);
      if (user) {
        await notifyComplaintSolved(complaint, user);
      }
    } catch (notifErr) {
      console.error('Notification error:', notifErr.message);
    }
    
    res.json({ message: 'Complaint marked as solved ✅', complaint });
  } catch (err) {
    res.status(500).json({ message: 'Error solving complaint', error: err.message });
  }
});

// 5️⃣ POST /api/complaints/:id/messages - Send message
router.post('/:id/messages', auth, upload.any(), async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    // Authorization check
    const isStudent = req.user.role === 'student';
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    if (isStudent && complaint.raisedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only message your own complaints' });
    }

    if (!isStudent && !isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
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

    // Handle file attachments
    const files = req.files || [];
    const attachmentUrls = files.map(f => `/uploads/${f.filename}`);

    // Create message
    const newMessage = {
        sender,
        message: req.body.message || "",
        attachments: attachmentUrls,
        createdAt: new Date(),
        seenByAdmin: sender === "admin",
        seenByStudent: sender === "student"
    };

    complaint.messages.push(newMessage);
    await complaint.save();

    // Audit log
    await createAuditLog('message', 'complaint', complaint._id, req.user.id, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Create notification
    try {
      if (isStudent) {
        // Notify all admins
        const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
        for (const admin of admins) {
          await Notification.create({
            user: admin._id,
            type: 'new_message',
            complaint: complaint._id,
            message: complaint.messages[complaint.messages.length - 1]._id.toString(),
            title: 'New message',
            body: `${complaint.raisedBy?.name || 'Student'} sent a message in "${complaint.title}"`
          });
        }
      } else {
        // Notify student
        await Notification.create({
          user: complaint.raisedBy,
          type: 'new_message',
          complaint: complaint._id,
          message: complaint.messages[complaint.messages.length - 1]._id.toString(),
          title: 'New message',
          body: `Admin replied to "${complaint.title}"`
        });
      }
    } catch (notifErr) {
      console.error('Notification creation error:', notifErr.message);
    }

    // Populate and return updated complaint
    await complaint.populate('raisedBy', 'name email');
    await complaint.populate('assignedTo', 'name email');

    res.json({ 
      message: 'Message sent successfully',
      complaint,
      newMessage: complaint.messages[complaint.messages.length - 1]
    });
  } catch (err) {
    res.status(500).json({ message: 'Error sending message', error: err.message });
  }
});

// 6️⃣ GET /api/complaints/:id/messages - Get all messages
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('raisedBy', 'name email')
      .populate('assignedTo', 'name email');

    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    const isStudent = req.user.role === "student";
    const isAdmin = ["admin", "superadmin"].includes(req.user.role);

    // Normalize IDs before comparison
    const complaintOwner = complaint.raisedBy?._id?.toString() || complaint.raisedBy?.toString();
    const assignedAdmin = complaint.assignedTo?._id?.toString() || complaint.assignedTo?.toString();
    const currentUser = req.user.id?.toString();

    // Authorization
    if (isStudent && complaintOwner !== currentUser) {
      return res.status(403).json({ message: "You can only view messages for your own complaints" });
    }
    if (!isStudent && !isAdmin) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Mark seen
    const seenField = isStudent ? "seenByStudent" : "seenByAdmin";
    complaint.messages.forEach(m => {
      if (m.sender !== (isStudent ? "student" : "admin")) {
        m[seenField] = true;
      }
    });
    await complaint.save();

    // Count unread (from opposite person)
    const unreadCount = complaint.messages.filter(m => {
      return isStudent ? m.sender === "admin" : m.sender === "student";
    }).length;

    return res.json({
      messages: complaint.messages,
      unreadCount,
      complaint
    });

  } catch (err) {
    return res.status(500).json({ message: "Error fetching messages", error: err.message });
  }
});


// 7️⃣ PATCH /api/complaints/:id/status - Update status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    const { status } = req.body;
    const validStatuses = ['open', 'in_review', 'resolved', 'closed'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const isStudent = req.user.role === 'student';
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    // Authorization and validation
    if (isStudent) {
      if (complaint.raisedBy.toString() !== req.user.id) {
        return res.status(403).json({ message: 'You can only update your own complaints' });
      }
      // Student can only set to 'closed' and only if status is 'resolved'
      if (status !== 'closed') {
        return res.status(403).json({ message: 'Students can only close resolved complaints' });
      }
      if (complaint.status !== 'resolved') {
        return res.status(400).json({ message: 'Can only close resolved complaints' });
      }
    } else if (isAdmin) {
      // Admin can set: in_review, resolved
      if (!['in_review', 'resolved'].includes(status)) {
        return res.status(403).json({ message: 'Admins can only set status to in_review or resolved' });
      }
      if (status === 'resolved') {
        complaint.assignedTo = req.user.id;
      }
    } else {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    complaint.status = status;
    await complaint.save();

    // Audit log
    await createAuditLog('status_update', 'complaint', complaint._id, req.user.id, {
      newStatus: status,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Create status change notification for student
    try {
      const statusMessages = {
        'in_review': 'Your complaint is now under review',
        'resolved': 'Your complaint has been resolved',
        'closed': 'Your complaint has been closed'
      };
      
      if (['in_review', 'resolved', 'closed'].includes(status)) {
        await Notification.create({
          user: complaint.raisedBy,
          type: 'status_change',
          complaint: complaint._id,
          title: 'Status updated',
          body: statusMessages[status] || `Status changed to ${status}`
        });
      }

      // Also call existing notification service for resolved
      if (status === 'resolved') {
        const user = await User.findById(complaint.raisedBy);
        if (user) {
          await notifyComplaintSolved(complaint, user);
        }
      }
    } catch (notifErr) {
      console.error('Notification error:', notifErr.message);
    }

    res.json({ message: 'Status updated successfully', complaint });
  } catch (err) {
    res.status(500).json({ message: 'Error updating status', error: err.message });
  }
});

// 8️⃣ PATCH /api/complaints/:id/close - Student closes complaint
router.patch('/:id/close', auth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    // Only students can close
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can close complaints' });
    }

    // Check ownership
    if (complaint.raisedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only close your own complaints' });
    }

    // Can only close if resolved
    if (complaint.status !== 'resolved') {
      return res.status(400).json({ message: 'Can only close resolved complaints' });
    }

    complaint.status = 'closed';
    await complaint.save();

    // Audit log
    await createAuditLog('close', 'complaint', complaint._id, req.user.id, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ message: 'Complaint closed successfully', complaint });
  } catch (err) {
    res.status(500).json({ message: 'Error closing complaint', error: err.message });
  }
});

// 9️⃣ POST /api/complaints/:complaintId/messages/:messageId/react - Add reaction
router.post('/:complaintId/messages/:messageId/react', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const complaint = await Complaint.findById(req.params.complaintId);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    // Authorization check
    const isStudent = req.user.role === 'student';
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    if (isStudent && complaint.raisedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (!isStudent && !isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const message = complaint.messages.id(req.params.messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      r => r.user.toString() === req.user.id && r.emoji === emoji
    );

    if (existingReaction) {
      // Toggle off - remove reaction
      message.reactions = message.reactions.filter(
        r => !(r.user.toString() === req.user.id && r.emoji === emoji)
      );
    } else {
      // Remove any existing reaction from this user, then add new one
      message.reactions = message.reactions.filter(
        r => r.user.toString() !== req.user.id
      );
      message.reactions.push({
        user: req.user.id,
        emoji,
        createdAt: new Date()
      });
    }

    await complaint.save();
    res.json({ message: 'Reaction updated', reactions: message.reactions });
  } catch (err) {
    res.status(500).json({ message: 'Error updating reaction', error: err.message });
  }
});

// 🔟 POST /api/complaints/:id/rating - Submit satisfaction rating
router.post('/:id/rating', auth, async (req, res) => {
  try {
    const { score, comment } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    // Only students can rate
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can rate complaints' });
    }

    // Check ownership
    if (complaint.raisedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Can only rate if resolved or closed
    if (!['resolved', 'closed'].includes(complaint.status)) {
      return res.status(400).json({ message: 'Can only rate resolved or closed complaints' });
    }

    complaint.ratingScore = score;
    complaint.ratingComment = comment;
    complaint.ratedAt = new Date();
    await complaint.save();

    res.json({ message: 'Rating submitted successfully', complaint });
  } catch (err) {
    res.status(500).json({ message: 'Error submitting rating', error: err.message });
  }
});

// 1️⃣1️⃣ POST /api/complaints/:id/typing - Update typing status
router.post('/:id/typing', auth, async (req, res) => {
  try {
    const { isTyping } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    // Authorization check
    const isStudent = req.user.role === 'student';
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    if (isStudent && complaint.raisedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (!isStudent && !isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    updateTyping(req.params.id, req.user.role, isTyping);
    res.json({ message: 'Typing status updated' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating typing status', error: err.message });
  }
});

// 1️⃣2️⃣ GET /api/complaints/:id/typing - Get typing status
router.get('/:id/typing', auth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    // Authorization check
    const isStudent = req.user.role === 'student';
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

    if (isStudent && complaint.raisedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (!isStudent && !isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const typing = getTyping(req.params.id);
    res.json(typing);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching typing status', error: err.message });
  }
});

// 1️⃣3️⃣ POST /api/complaints/:id/messages/audio - DISABLED (use /api/replies/complaint/:id/audio instead)
router.post('/:id/messages/audio', auth, (req, res) => {
  return res.status(404).json({ message: 'This endpoint is disabled. Use /api/replies/complaint/:id/audio instead' });
});

module.exports = router;
