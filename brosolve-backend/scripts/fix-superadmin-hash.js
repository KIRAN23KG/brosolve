// scripts/fix-superadmin-hash.js
// Diagnostic and fix script for superadmin password hash
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

const SUPERADMIN_EMAIL = 'superadmin@brosolve.com';
const EXPECTED_PASSWORD = 'superadmin123';

async function diagnoseAndFix() {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 DIAGNOSING SUPERADMIN PASSWORD HASH');
    console.log('═══════════════════════════════════════════════════════');
    
    // Connect to MongoDB
    console.log('\n📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');
    
    // Find superadmin user
    console.log(`\n🔍 Searching for superadmin: ${SUPERADMIN_EMAIL}`);
    const user = await User.findOne({ email: SUPERADMIN_EMAIL });
    
    if (!user) {
      console.log('❌ ERROR: Superadmin user not found!');
      console.log('   Email:', SUPERADMIN_EMAIL);
      await mongoose.connection.close();
      process.exit(1);
    }
    
    console.log('✅ Superadmin user found');
    console.log('   ID:', user._id.toString());
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Name:', user.name);
    
    // Store BEFORE state
    const beforeHash = user.passwordHash;
    const documentId = user._id.toString();
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🧪 TESTING CURRENT HASH');
    console.log('═══════════════════════════════════════════════════════');
    console.log('   Expected Password:', EXPECTED_PASSWORD);
    console.log('   Stored Hash:', beforeHash);
    console.log('   Hash Length:', beforeHash.length);
    console.log('   Hash Prefix:', beforeHash.substring(0, 30) + '...');
    
    // Test current hash
    const currentHashWorks = await bcrypt.compare(EXPECTED_PASSWORD, beforeHash);
    console.log('   bcrypt.compare() Result:', currentHashWorks);
    
    if (currentHashWorks) {
      console.log('\n✅ Current hash is CORRECT! No fix needed.');
      console.log('   The password hash matches the expected password.');
      await mongoose.connection.close();
      process.exit(0);
    }
    
    console.log('\n❌ Current hash does NOT match expected password!');
    console.log('   Generating new hash and updating...');
    
    // Generate new hash
    const saltRounds = Number(process.env.BCRYPT_SALT) || 10;
    console.log(`\n🔐 Generating new hash with ${saltRounds} salt rounds...`);
    const newHash = await bcrypt.hash(EXPECTED_PASSWORD, saltRounds);
    console.log('✅ New hash generated');
    console.log('   New Hash:', newHash);
    console.log('   New Hash Length:', newHash.length);
    console.log('   New Hash Prefix:', newHash.substring(0, 30) + '...');
    
    // Update the user
    console.log('\n💾 Updating superadmin document in MongoDB...');
    user.passwordHash = newHash;
    await user.save();
    console.log('✅ Document updated successfully');
    
    // Verify the fix
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ VERIFYING FIX');
    console.log('═══════════════════════════════════════════════════════');
    
    // Fetch fresh user from database
    const freshUser = await User.findById(user._id);
    const verificationResult = await bcrypt.compare(EXPECTED_PASSWORD, freshUser.passwordHash);
    
    console.log('   Testing with expected password:', EXPECTED_PASSWORD);
    console.log('   Updated hash:', freshUser.passwordHash);
    console.log('   bcrypt.compare() Result:', verificationResult);
    
    if (verificationResult) {
      console.log('\n✅ VERIFICATION SUCCESSFUL!');
      console.log('   PASSWORD MATCH => true');
    } else {
      console.log('\n❌ VERIFICATION FAILED!');
      console.log('   Something went wrong with the update.');
      await mongoose.connection.close();
      process.exit(1);
    }
    
    // Show BEFORE → AFTER summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 BEFORE → AFTER SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📧 Email:', SUPERADMIN_EMAIL);
    console.log('🆔 Document ID:', documentId);
    console.log('\n📉 BEFORE:');
    console.log('   Old Hash:', beforeHash);
    console.log('   Old Hash Length:', beforeHash.length);
    console.log('   Old Hash Prefix:', beforeHash.substring(0, 30) + '...');
    console.log('   bcrypt.compare() Result:', false);
    console.log('\n📈 AFTER:');
    console.log('   New Hash:', freshUser.passwordHash);
    console.log('   New Hash Length:', freshUser.passwordHash.length);
    console.log('   New Hash Prefix:', freshUser.passwordHash.substring(0, 30) + '...');
    console.log('   bcrypt.compare() Result:', true);
    console.log('\n✅ Superadmin password hash has been fixed!');
    console.log('═══════════════════════════════════════════════════════');
    
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    console.error('Stack:', error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
diagnoseAndFix();

