require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const admin2 = await User.findOne({ email: 'admin2@brosolve.com' });
    
    if (!admin2) {
      console.log('❌ admin2@brosolve.com NOT FOUND');
      process.exit(1);
    }
    
    console.log('\n=== ADMIN2 USER DOCUMENT ===');
    console.log(JSON.stringify(admin2.toObject(), null, 2));
    console.log('\n=== VERIFICATION ===');
    console.log('Email:', admin2.email);
    console.log('Role:', admin2.role);
    console.log('Role is admin?', admin2.role === 'admin' ? '✅ YES' : '❌ NO');
    
    // Ensure role is admin
    if (admin2.role !== 'admin' && admin2.role !== 'superadmin') {
      console.log('\n⚠️  Role is not admin. Fixing...');
      admin2.role = 'admin';
      await admin2.save();
      console.log('✅ Role updated to admin');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });

