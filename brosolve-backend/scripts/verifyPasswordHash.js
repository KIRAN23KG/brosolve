// Diagnostic script to verify passwordHash in MongoDB
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

async function verifyPasswordHash() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const testEmail = 'admin2@brosolve.com';
    const testPassword = 'admin123';

    console.log('🔍 Searching for user:', testEmail);
    const user = await User.findOne({ email: testEmail });

    if (!user) {
      console.log('❌ User not found in database');
      process.exit(1);
    }

    console.log('✅ USER FOUND IN DATABASE:');
    console.log('  - ID:', user._id);
    console.log('  - Email:', user.email);
    console.log('  - Role:', user.role);
    console.log('  - PasswordHash exists:', !!user.passwordHash);
    console.log('  - PasswordHash length:', user.passwordHash ? user.passwordHash.length : 0);
    console.log('  - PasswordHash value:', user.passwordHash);
    console.log('  - PasswordHash prefix:', user.passwordHash ? user.passwordHash.substring(0, 30) + '...' : 'NONE');
    console.log('');

    console.log('🔐 Testing password comparison:');
    console.log('  - Test password:', testPassword);
    console.log('  - Stored hash:', user.passwordHash);
    console.log('');

    const match = await bcrypt.compare(testPassword, user.passwordHash);
    console.log('  - Password match result:', match);
    console.log('');

    if (match) {
      console.log('✅ PASSWORD HASH IS CORRECT');
    } else {
      console.log('❌ PASSWORD HASH MISMATCH');
      console.log('');
      console.log('🔍 Testing with known hash from createAdmin2.js:');
      const knownHash = '$2b$10$X2R8CVDFYkdlbjdYWtTK7uJ1v3uCG2lLBVmOAXoJ2i8LojRxurxDO';
      const matchKnown = await bcrypt.compare(testPassword, knownHash);
      console.log('  - Known hash match:', matchKnown);
      console.log('  - Current hash matches known:', user.passwordHash === knownHash);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

verifyPasswordHash();

