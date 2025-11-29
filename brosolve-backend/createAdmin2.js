const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

mongoose.connect('mongodb://localhost:27017/brosolve')
  .then(async () => {
    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash('admin123', saltRounds);
    
    // Create the admin user
    await User.create({
      name: 'Admin Two',
      email: 'admin2@brosolve.com',
      passwordHash: passwordHash,
      role: 'admin'
    });
    
    console.log('Admin2 created successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });

