// scripts/fixAuthUsers.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

const usersToFix = [
  {
    email: 'superadmin@brosolve.com',
    desiredPassword: 'superadmin123',
    role: 'superadmin',
    name: 'Super Admin',
    isHead: true
  },
  {
    email: 'admin2@brosolve.com',
    desiredPassword: 'admin123',
    role: 'admin',
    name: 'Brosolve Admin',
    isHead: false
  },
  {
    email: 'gk123@gmail.com',
    desiredPassword: 'student123',
    role: 'student',
    name: 'Aadhvika',
    isHead: false
  }
];

async function fixAuthUsers() {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔧 FIXING AUTH USERS');
    console.log('═══════════════════════════════════════════════════════\n');

    if (!process.env.MONGO_URI) {
      console.error('❌ ERROR: MONGO_URI not found in environment variables');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const saltRounds = Number(process.env.BCRYPT_SALT) || 10;
    const results = [];

    for (const userInfo of usersToFix) {
      console.log(`📧 Processing: ${userInfo.email}`);
      
      const before = {
        existed: false,
        role: null,
        hashLength: 0,
        compareResult: false
      };

      const user = await User.findOne({ email: userInfo.email });
      
      if (user) {
        before.existed = true;
        before.role = user.role;
        before.hashLength = user.passwordHash ? user.passwordHash.length : 0;
        if (user.passwordHash) {
          before.compareResult = await bcrypt.compare(userInfo.desiredPassword, user.passwordHash);
        }
        console.log(`   ✅ User exists (ID: ${user._id})`);
        console.log(`   📝 BEFORE: role=${before.role}, hashLength=${before.hashLength}, compareResult=${before.compareResult}`);
      } else {
        console.log(`   ⚠️  User does not exist - will create`);
      }

      // Generate new hash
      const newHash = await bcrypt.hash(userInfo.desiredPassword, saltRounds);
      
      // Verify new hash immediately
      const verifyNewHash = await bcrypt.compare(userInfo.desiredPassword, newHash);
      if (!verifyNewHash) {
        console.error(`   ❌ ERROR: New hash verification failed for ${userInfo.email}`);
        continue;
      }

      if (user) {
        // Update existing user
        const oldRole = user.role;
        user.passwordHash = newHash;
        
        // Update role if it doesn't match desired role
        if (user.role !== userInfo.role) {
          console.log(`   🔄 Updating role: ${oldRole} → ${userInfo.role}`);
          user.role = userInfo.role;
        }
        
        // Update name if provided
        if (userInfo.name && user.name !== userInfo.name) {
          console.log(`   🔄 Updating name: ${user.name} → ${userInfo.name}`);
          user.name = userInfo.name;
        }
        
        // Update isHead if needed
        if (user.isHead !== userInfo.isHead) {
          console.log(`   🔄 Updating isHead: ${user.isHead} → ${userInfo.isHead}`);
          user.isHead = userInfo.isHead;
        }
        
        await user.save();
        console.log(`   ✅ User updated`);
      } else {
        // Create new user
        const newUser = new User({
          name: userInfo.name,
          email: userInfo.email,
          passwordHash: newHash,
          role: userInfo.role,
          isHead: userInfo.isHead
        });
        await newUser.save();
        console.log(`   ✅ User created (ID: ${newUser._id})`);
      }

      // Verify after update/create
      const updatedUser = await User.findOne({ email: userInfo.email });
      const after = {
        existed: true,
        role: updatedUser.role,
        hashLength: updatedUser.passwordHash ? updatedUser.passwordHash.length : 0,
        compareResult: false
      };
      if (updatedUser.passwordHash) {
        after.compareResult = await bcrypt.compare(userInfo.desiredPassword, updatedUser.passwordHash);
      }

      console.log(`   📝 AFTER: role=${after.role}, hashLength=${after.hashLength}, compareResult=${after.compareResult}`);
      console.log('');

      results.push({
        email: userInfo.email,
        before,
        after
      });
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 SUMMARY TABLE');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('Email'.padEnd(30) + '| Existed | Role (old→new) | Hash Length (old→new) | Compare (old→new)');
    console.log('-'.repeat(100));
    
    for (const result of results) {
      const email = result.email.padEnd(30);
      const existed = result.before.existed ? 'YES' : 'NO';
      const roleChange = `${result.before.role || 'N/A'} → ${result.after.role}`;
      const hashChange = `${result.before.hashLength} → ${result.after.hashLength}`;
      const compareChange = `${result.before.compareResult ? 'TRUE' : 'FALSE'} → ${result.after.compareResult ? 'TRUE' : 'FALSE'}`;
      
      console.log(`${email} | ${existed.padEnd(7)} | ${roleChange.padEnd(15)} | ${hashChange.padEnd(20)} | ${compareChange}`);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Fix complete');
    console.log('═══════════════════════════════════════════════════════');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err);
    process.exit(1);
  }
}

fixAuthUsers();

