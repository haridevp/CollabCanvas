/**
 * @fileoverview Utility script to promote a user to admin via CLI.
 * Usage: node makeAdmin.js <user_email>
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const emailToPromote = process.argv[2];

if (!emailToPromote) {
  console.error('Usage: node makeAdmin.js <user_email>');
  process.exit(1);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/collabcanvas';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log(`Connected to database. Searching for user: ${emailToPromote}`);
    
    const user = await User.findOne({ email: emailToPromote.toLowerCase() });
    
    if (!user) {
      console.error(`User not found with email: ${emailToPromote}`);
      process.exit(1);
    }
    
    if (user.role === 'admin') {
      console.log(`User ${emailToPromote} is already an admin.`);
      process.exit(0);
    }
    
    user.role = 'admin';
    await user.save();
    
    console.log(`Successfully promoted ${emailToPromote} to admin!`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Database connection error:', err);
    process.exit(1);
  });
