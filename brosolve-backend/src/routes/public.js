// src/routes/public.js
const express = require('express');
const Complaint = require('../models/Complaint');
const router = express.Router();

router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const total = await Complaint.countDocuments();
    const solved = await Complaint.countDocuments({ status: 'resolved' });
    const todayCount = await Complaint.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } });
    const percent = total ? Math.round((solved / total) * 100) : 0;
    res.json({ total, solved, today: todayCount, percent });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching stats', error: err.message });
  }
});

module.exports = router;
