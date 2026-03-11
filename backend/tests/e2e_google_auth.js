const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: __dirname + '/../.env' });
const User = require('../models/User');

async function test() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/collabcanvas');

  // 1. Simulate Google Login new user
  const email = 'test_e2e_google@example.com';
  let user = await User.findOne({ email });
  if (user) await User.findByIdAndDelete(user._id);

  user = new User({
    displayName: 'Test Google',
    username: 'testgoogle_e2e_' + Date.now().toString().slice(-4),
    email,
    googleId: '1234567890_e2e',
    isVerified: true
  });
  await user.save();
  
  // Create token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
  console.log("Generated Token length:", token.length);

  // 2. Simulate auth middleware
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const foundUser = await User.findById(decoded.id);
    if (!foundUser) throw new Error("User not found");
    console.log("Auth Middleware success! User ID:", foundUser._id);
  } catch (err) {
    console.error("Auth Middleware Error:", err.message);
  }
  
  // Cleanup
  await User.findByIdAndDelete(user._id);
  await mongoose.disconnect();
}
test().catch(console.error);
