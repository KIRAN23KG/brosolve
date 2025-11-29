require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    // Check if user already exists and ensure role is admin
    const exists = await User.findOne({ email: 'admin2@brosolve.com' });
    if (exists) {
      if (exists.role !== 'admin' && exists.role !== 'superadmin') {
        console.log('Admin2 user exists but role is not admin. Updating role to admin...');
        exists.role = 'admin';
        await exists.save();
        console.log('ADMIN2 ROLE UPDATED SUCCESSFULLY');
      } else {
        console.log('Admin2 user already exists with admin role.');
      }
    } else {
      await User.create({
        name: 'Super Admin',
        email: 'admin2@brosolve.com',
        passwordHash: '$2b$10$X2R8CVDFYkdlbjdYWtTK7uJ1v3uCG2lLBVmOAXoJ2i8LojRxurxDO', 
        role: 'admin'
      });
      console.log('ADMIN2 CREATED SUCCESSFULLY');
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });

