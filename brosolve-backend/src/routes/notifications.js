// src/routes/notifications.js
const express = require('express');
const Notification = require('../models/Notification');

const router = express.Router();

// GET /api/notifications - Get all notifications for current user
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .populate('complaint', 'title status')
      .sort({ createdAt: -1 })
      .limit(50);
    
    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      isRead: false
    });

    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching notifications', error: err.message });
  }
});

// PATCH /api/notifications/:id/read - Mark one as read
router.patch('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (err) {
    res.status(500).json({ message: 'Error updating notification', error: err.message });
  }
});

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { isRead: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating notifications', error: err.message });
  }
});

// PATCH /api/notifications/complaint/:complaintId/read - Mark all notifications for a complaint as read
router.patch('/complaint/:complaintId/read', async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, complaint: req.params.complaintId, isRead: false },
      { isRead: true }
    );

    res.json({ message: 'Complaint notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating notifications', error: err.message });
  }
});

module.exports = router;

