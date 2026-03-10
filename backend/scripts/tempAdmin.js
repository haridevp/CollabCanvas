require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const connectDB = require('../config/database');
const User = require('../models/User');

const emailToPromote = process.argv[2];

const run = async () => {
  try {
    await connectDB();
    console.log(`Connected. Updating ${emailToPromote}...`);
    
    const user = await User.findOne({ email: emailToPromote.toLowerCase() });
    if (!user) {
       console.log("User not found: " + emailToPromote);
       process.exit(1);
    }
    
    user.role = 'admin';
    await user.save();
    console.log("Success! Role updated.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
