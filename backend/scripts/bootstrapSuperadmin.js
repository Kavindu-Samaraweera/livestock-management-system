const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../src/models/User');
const connectDatabase = require('../src/config/database');

const run = async () => {
  const email = String(process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD || '';
  if (!email || !password || password.length < 12) throw new Error('Set SUPERADMIN_EMAIL and a SUPERADMIN_PASSWORD of at least 12 characters in backend/.env.');
  await connectDatabase();
  const existing = await User.findOne({ email });
  if (existing) throw new Error('An account already exists for SUPERADMIN_EMAIL. No account was changed.');
  await User.create({ name: 'System Administrator', email, password, role: 'superadmin', status: 'active' });
  console.log('Superadmin account created successfully.');
};

run().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(async () => { if (mongoose.connection.readyState) await mongoose.disconnect(); });
