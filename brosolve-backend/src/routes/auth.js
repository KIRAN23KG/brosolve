// src/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Explicitly parse JSON for auth routes (safety measure)
router.use(express.json());

// Register - ALWAYS creates students only (security: prevent role escalation via registration)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });

    const exists = await User.findOne({ email });
    if (exists) {
      // Safety: Never downgrade existing admin/superadmin during registration
      if (exists.role === 'admin' || exists.role === 'superadmin') {
        return res.status(400).json({ message: 'Email already registered as admin' });
      }
      return res.status(400).json({ message: 'Email already registered' });
    }

    const saltRounds = Number(process.env.BCRYPT_SALT) || 10;
    const hash = await bcrypt.hash(password, saltRounds);

    // FORCE role to 'student' - registration endpoint must never create admins
    const user = new User({
      name,
      email,
      passwordHash: hash,
      role: 'student', // Always student, regardless of what's passed
      phone
    });

    await user.save();

    // don't return passwordHash
    const safe = { id: user._id, name: user.name, email: user.email, role: user.role };
    res.status(201).json({ message: 'Registered', user: safe });
  } catch (err) {
    console.error('Register error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    console.log("═══════════════════════════════════════════════════════");
    console.log("🔐 [LOGIN] STARTING LOGIN PROCESS");
    console.log("LOGIN BODY =>", JSON.stringify(req.body, null, 2));
    console.log("LOGIN BODY TYPE =>", typeof req.body);
    console.log("LOGIN BODY KEYS =>", Object.keys(req.body || {}));
    
    const { email, password } = req.body;
    console.log("═══════════════════════════════════════════════════════");
    console.log("📧 RECEIVED EMAIL =>", email);
    console.log("🔑 RECEIVED PASSWORD =>", password);
    console.log("EXTRACTED EMAIL =>", email);
    console.log("EXTRACTED PASSWORD =>", password ? `${password.substring(0, 2)}***` : 'UNDEFINED');
    
    if (!email || !password) {
      console.log("❌ [LOGIN] MISSING FIELDS - Email:", !!email, "Password:", !!password);
      return res.status(400).json({ message: 'Missing fields' });
    }

    console.log("🔍 [LOGIN] SEARCHING FOR USER WITH EMAIL:", email);
    const user = await User.findOne({ email });
    console.log("USER FOUND =>", user ? {
      id: user._id,
      email: user.email,
      role: user.role,
      hasPasswordHash: !!user.passwordHash,
      passwordHashLength: user.passwordHash ? user.passwordHash.length : 0,
      passwordHashPrefix: user.passwordHash ? user.passwordHash.substring(0, 20) + '...' : 'NONE'
    } : 'NULL');
    
    if (!user) {
      console.log("❌ [LOGIN] USER NOT FOUND");
      return res.status(404).json({ message: 'User not found' });
    }

    console.log("STORED HASH DURING LOGIN:", user.passwordHash);
    console.log("🔐 [LOGIN] COMPARING PASSWORD");
    console.log("  - Plain password length:", password.length);
    console.log("  - Stored hash length:", user.passwordHash.length);
    console.log("  - Stored hash prefix:", user.passwordHash.substring(0, 20) + '...');
    
    console.log("═══════════════════════════════════════════════════════");
    console.log("🔍 DIAGNOSTIC INFO:");
    console.log("  📧 Received Email:", email);
    console.log("  🔑 Received Password:", password);
    console.log("  💾 Stored PasswordHash:", user.passwordHash);
    const ok = await bcrypt.compare(password, user.passwordHash);
    console.log("  ✅ bcrypt.compare() Result:", ok);
    console.log("═══════════════════════════════════════════════════════");
    console.log("PASSWORD MATCH =>", ok);
    
    if (!ok) {
      console.log("❌ [LOGIN] PASSWORD MISMATCH");
      console.log("  - Attempted password:", password);
      console.log("  - Stored hash:", user.passwordHash);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // CRITICAL: Always fetch fresh user from database to ensure correct role
    const freshUser = await User.findById(user._id);
    if (!freshUser) return res.status(404).json({ message: 'User not found' });
    
    // Use role directly from database - ALWAYS fresh, never cached or overwritten
    const dbRole = freshUser.role; // Direct from database
    
    const payload = { id: freshUser._id.toString(), role: dbRole, name: freshUser.name };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    // ALWAYS return role from database in response - exact structure required
    const response = { 
      token, 
      user: { 
        id: payload.id, 
        name: payload.name, 
        role: payload.role, 
        email: freshUser.email 
      } 
    };
    
    console.log("FINAL RESPONSE =>", JSON.stringify({
      token: token.substring(0, 20) + '...',
      user: response.user
    }, null, 2));
    console.log("✅ [LOGIN] SUCCESS");
    console.log("═══════════════════════════════════════════════════════");
    
    res.json(response);
  } catch (err) {
    console.error('❌ [LOGIN] ERROR =>', err);
    console.error('❌ [LOGIN] ERROR STACK =>', err.stack);
    console.log("═══════════════════════════════════════════════════════");
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user (protected) - ALWAYS returns fresh role from database
router.get('/me', require('../middleware/auth').auth, async (req, res) => {
  try {
    // CRITICAL: Always fetch fresh user from database to ensure correct role
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // ALWAYS return fresh role directly from database - never cached or overwritten
    res.json({ 
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role // Direct from database
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Development-only: Create admin user
router.post('/dev/create-admin', async (req, res) => {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'This endpoint is disabled in production' });
  }
  
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing fields: name, email, password' });
    }
    
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });
    
    const saltRounds = Number(process.env.BCRYPT_SALT) || 10;
    const hash = await bcrypt.hash(password, saltRounds);
    
    const user = new User({
      name,
      email,
      passwordHash: hash,
      role: 'admin' // Explicitly set to admin
    });
    
    await user.save();
    
    const safe = { id: user._id, name: user.name, email: user.email, role: user.role };
    res.status(201).json({ success: true, admin: safe });
  } catch (err) {
    console.error('Create admin error', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Development-only: Fix existing user role to admin
router.patch('/dev/fix-admin-role', async (req, res) => {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'This endpoint is disabled in production' });
  }
  
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.role = 'admin';
    await user.save();
    
    res.json({ success: true });
  } catch (err) {
    console.error('Fix admin role error', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Development-only: Fix any user role
router.patch('/dev/fix-role', async (req, res) => {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'This endpoint is disabled in production' });
  }
  
  try {
    const { email, role } = req.body;
    if (!email || !role) {
      return res.status(400).json({ message: 'Email and role are required' });
    }
    
    // Validate role
    if (!['student', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be: student, admin, or superadmin' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update role in database
    user.role = role;
    await user.save();
    
    res.json({ success: true, user: { email: user.email, role: user.role } });
  } catch (err) {
    console.error('Fix role error', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
