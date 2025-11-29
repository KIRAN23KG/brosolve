// src/routes/admins.js
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { isSuperAdmin } = require('../middleware/role');

const router = express.Router();

// Create admin - SUPERADMIN ONLY
router.post('/create', auth, isSuperAdmin, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing fields: name, email, password' });
    }

    // Check if user already exists
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const saltRounds = Number(process.env.BCRYPT_SALT) || 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create admin user
    const admin = new User({
      name,
      email,
      passwordHash,
      role: 'admin' // Always create as admin (not superadmin for security)
    });

    await admin.save();

    // Return safe user object (no passwordHash)
    const safe = {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role
    };

    res.status(201).json({ 
      success: true, 
      message: 'Admin created successfully',
      admin: safe 
    });
  } catch (err) {
    console.error('Create admin error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;

