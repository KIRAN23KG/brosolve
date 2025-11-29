// src/routes/analyticsDashboard.js
const express = require('express');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Category = require('../models/Category');
const { auth } = require('../middleware/auth');
const { permit } = require('../middleware/role');

const router = express.Router();

// All routes require authentication and admin/superadmin role
router.use(auth);
router.use(permit('admin', 'superadmin'));

// Helper: Get date range for N days
function getDateRange(days) {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);
  return { startDate, endDate };
}

// Helper: Format date as YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// 1) GET /trends/7days - Last 7 days trend
router.get('/trends/7days', async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(7);
    const result = [];
    
    // Generate all 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const count = await Complaint.countDocuments({
        createdAt: { $gte: date, $lt: nextDate }
      });
      
      result.push({
        date: formatDate(date),
        count
      });
    }
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching 7-day trends', error: err.message });
  }
});

// 2) GET /trends/30days - Last 30 days trend
router.get('/trends/30days', async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(30);
    const result = [];
    
    // Generate all 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const count = await Complaint.countDocuments({
        createdAt: { $gte: date, $lt: nextDate }
      });
      
      result.push({
        date: formatDate(date),
        count
      });
    }
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching 30-day trends', error: err.message });
  }
});

// 3) GET /by-category - Complaints grouped by category (only active categories)
router.get('/by-category', async (req, res) => {
  try {
    // Get active categories
    const activeCategories = await Category.find({ isActive: true }).select('name');
    const categoryNames = activeCategories.map(c => c.name);
    
    // Aggregate complaints by category
    const categoryData = await Complaint.aggregate([
      {
        $match: {
          category: { $in: categoryNames }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Include categories with zero complaints
    const result = categoryNames.map(catName => {
      const found = categoryData.find(item => item._id === catName);
      return {
        category: catName,
        count: found ? found.count : 0
      };
    });
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching category breakdown', error: err.message });
  }
});

// 4) GET /by-status - Complaints grouped by status
router.get('/by-status', async (req, res) => {
  try {
    const statusData = await Complaint.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Ensure all statuses are included (even with 0 count)
    const statuses = ['open', 'in_review', 'resolved'];
    const result = statuses.map(status => {
      const found = statusData.find(item => item._id === status);
      return {
        status: status,
        count: found ? found.count : 0
      };
    });
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching status breakdown', error: err.message });
  }
});

// 5) GET /by-center - Complaints grouped by centerType
router.get('/by-center', async (req, res) => {
  try {
    const centerData = await Complaint.aggregate([
      {
        $group: {
          _id: '$centerType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    const result = centerData.map(item => ({
      centerType: item._id,
      count: item.count
    }));
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching center breakdown', error: err.message });
  }
});

// 6) GET /heatmap - Last 30 days calendar-style heatmap
router.get('/heatmap', async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(30);
    const result = [];
    
    // Generate all 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const count = await Complaint.countDocuments({
        createdAt: { $gte: date, $lt: nextDate }
      });
      
      result.push({
        date: formatDate(date),
        count
      });
    }
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching heatmap data', error: err.message });
  }
});

// 7) GET /top-users - Top 10 users with most complaints
router.get('/top-users', async (req, res) => {
  try {
    const topUsers = await Complaint.aggregate([
      {
        $group: {
          _id: '$raisedBy',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Populate user details
    const userIds = topUsers.map(item => item._id);
    const users = await User.find({ _id: { $in: userIds } }).select('name email');
    const userMap = {};
    users.forEach(user => {
      userMap[user._id.toString()] = user;
    });
    
    const result = topUsers.map(item => {
      const user = userMap[item._id.toString()];
      return {
        userId: item._id.toString(),
        name: user ? user.name : 'Unknown',
        email: user ? user.email : 'N/A',
        count: item.count
      };
    });
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching top users', error: err.message });
  }
});

// 8) GET /resolution-time - Resolution time stats for resolved complaints
router.get('/resolution-time', async (req, res) => {
  try {
    const resolvedComplaints = await Complaint.find({ status: 'resolved' })
      .select('createdAt updatedAt')
      .lean();
    
    if (resolvedComplaints.length === 0) {
      return res.json({
        avgResolutionHours: 0,
        minResolutionHours: 0,
        maxResolutionHours: 0
      });
    }
    
    const resolutionHours = resolvedComplaints.map(complaint => {
      // Use updatedAt as proxy for resolvedAt (when status was changed to resolved)
      const createdAt = new Date(complaint.createdAt);
      const resolvedAt = new Date(complaint.updatedAt);
      const diffMs = resolvedAt - createdAt;
      return diffMs / (1000 * 60 * 60); // Convert to hours
    }).filter(hours => hours >= 0); // Filter out negative values (shouldn't happen)
    
    if (resolutionHours.length === 0) {
      return res.json({
        avgResolutionHours: 0,
        minResolutionHours: 0,
        maxResolutionHours: 0
      });
    }
    
    const avgResolutionHours = resolutionHours.reduce((a, b) => a + b, 0) / resolutionHours.length;
    const minResolutionHours = Math.min(...resolutionHours);
    const maxResolutionHours = Math.max(...resolutionHours);
    
    res.json({
      avgResolutionHours: Math.round(avgResolutionHours * 100) / 100, // Round to 2 decimals
      minResolutionHours: Math.round(minResolutionHours * 100) / 100,
      maxResolutionHours: Math.round(maxResolutionHours * 100) / 100
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching resolution time', error: err.message });
  }
});

module.exports = router;

