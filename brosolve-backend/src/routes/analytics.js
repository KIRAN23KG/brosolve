// src/routes/analytics.js
const express = require('express');
const Complaint = require('../models/Complaint');

const router = express.Router();

// GET /api/public/analytics - Analytics data
router.get('/', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Per-day counts for last N days
    const perDayCounts = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const count = await Complaint.countDocuments({
        createdAt: { $gte: date, $lt: nextDate }
      });
      
      perDayCounts.push({
        date: date.toISOString().split('T')[0],
        count
      });
    }
    
    // Per-category breakdown
    const categoryBreakdown = await Complaint.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Status breakdown
    const statusBreakdown = await Complaint.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Center type breakdown
    const centerTypeBreakdown = await Complaint.aggregate([
      {
        $group: {
          _id: '$centerType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      perDayCounts,
      categoryBreakdown: categoryBreakdown.map(item => ({ category: item._id, count: item.count })),
      statusBreakdown: statusBreakdown.map(item => ({ status: item._id, count: item.count })),
      centerTypeBreakdown: centerTypeBreakdown.map(item => ({ centerType: item._id, count: item.count }))
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching analytics', error: err.message });
  }
});

module.exports = router;

