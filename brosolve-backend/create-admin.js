require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/brosolve')
  .then(async () => {
    await User.create({
      name: 'New Admin',
      email: 'admin2@brosolve.com',
      passwordHash: '$2b$10$X2R8CVDFYkdlbjdYWtTK7uJ1v3uCG2lLBVmOAXoJ2i8LojRxurxDO',
      role: 'admin'
    });
    console.log('New ADMIN account created successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

