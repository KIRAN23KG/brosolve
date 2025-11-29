// scripts/diagnoseAuthUsers.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

const usersToCheck = [
  {
    email: 'superadmin@brosolve.com',
    desiredPassword: 'superadmin123',
    role: 'superadmin'
  },
  {
    email: 'admin2@brosolve.com',
    desiredPassword: 'admin123',
    role: 'admin'
  },
  {
    email: 'gk123@gmail.com',
    desiredPassword: 'student123',
    role: 'student'
  }
];

async function diagnoseAuthUsers() {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 AUTH USER DIAGNOSTICS');
    console.log('═══════════════════════════════════════════════════════\n');

    if (!process.env.MONGO_URI) {
      console.error('❌ ERROR: MONGO_URI not found in environment variables');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    for (const userInfo of usersToCheck) {
      console.log(`📧 Checking: ${userInfo.email}`);
      console.log(`   Desired password: ${userInfo.desiredPassword}`);
      console.log(`   Expected role: ${userInfo.role}`);
      
      const user = await User.findOne({ email: userInfo.email });
      
      if (!user) {
        console.log('   ❌ Status: NOT FOUND\n');
        continue;
      }

      console.log(`   ✅ User found:`);
      console.log(`      - ID: ${user._id}`);
      console.log(`      - Name: ${user.name}`);
      console.log(`      - Role: ${user.role}`);
      console.log(`      - PasswordHash length: ${user.passwordHash ? user.passwordHash.length : 0}`);
      console.log(`      - PasswordHash prefix: ${user.passwordHash ? user.passwordHash.substring(0, 20) + '...' : 'NONE'}`);

      if (user.passwordHash) {
        const compareResult = await bcrypt.compare(userInfo.desiredPassword, user.passwordHash);
        console.log(`      - bcrypt.compare() result: ${compareResult ? '✅ TRUE' : '❌ FALSE'}`);
      } else {
        console.log(`      - bcrypt.compare() result: ❌ NO PASSWORD HASH`);
      }
      
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Diagnostics complete');
    console.log('═══════════════════════════════════════════════════════');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err);
    process.exit(1);
  }
}

diagnoseAuthUsers();

