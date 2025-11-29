// scripts/seedAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

async function run(){
  await mongoose.connect(process.env.MONGO_URI);
  const email = 'admin@brototype.in';
  const exists = await User.findOne({ email });
  if (exists) {
    console.log('Admin exists');
    process.exit(0);
  }
  const hash = await bcrypt.hash('Admin@123', 10);
  const admin = new User({ name: 'Brototype Admin', email, passwordHash: hash, role: 'admin', isHead: true });
  await admin.save();
  console.log('Admin created', email);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
