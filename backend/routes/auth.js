const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

// 1. Username Availability Check
router.get('/check-username/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase().trim() });
    if (user) {
      return res.json({
        available: false,
        message: 'Username is taken',
        suggestions: [`${req.params.username}${Math.floor(Math.random() * 100)}`, `${req.params.username}_canvas`]
      });
    }
    res.json({ available: true, message: 'Username is available!' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 2. Registration with Styled Email
router.post('/register', async (req, res) => {
  try {
    const { fullName, username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username: username.toLowerCase() }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email or Username already taken' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationToken = crypto.randomBytes(20).toString('hex');

    const newUser = new User({
      displayName: fullName,
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      isVerified: false,
      verificationToken,
      verificationTokenExpires: Date.now() + 24 * 3600000 
    });

    await newUser.save();

    const verificationUrl = `http://localhost:5173/verify-email?token=${verificationToken}`;
    
    try {
      await sendEmail({
        email: newUser.email,
        subject: 'Confirm your Collaborative Canvas Account',
        verificationUrl: verificationUrl // Standardized key
      });
    } catch (mailErr) {
      console.log("⚠️ Mail Delivery Failed:", mailErr.message);
    }

    res.status(201).json({ success: true, message: "Registration successful! Please check your email." });
  } catch (err) {
    console.error("❌ REGISTRATION ERROR:", err.message);
    res.status(400).json({ success: false, message: "Registration failed: " + err.message });
  }
});

// 3. Email Verification
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: "Missing token." });

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      const alreadyVerified = await User.findOne({ verificationToken: undefined, isVerified: true });
      if (alreadyVerified) return res.json({ success: true, message: "Account already verified." });
      return res.status(400).json({ success: false, message: "Invalid or expired token." });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.json({ success: true, message: "Account successfully activated!" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// 4. Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!user.isVerified) return res.status(403).json({ success: false, message: 'Please verify your email.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    user.loginActivities.push({ status: 'success', timestamp: new Date() });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ success: true, token, user: { id: user._id, username: user.username, email: user.email, fullName: user.displayName } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// 5. FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) return res.json({ success: true, message: "If an account exists, a reset link has been sent." });

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; 
    await user.save();

    const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Request',
        resetUrl: resetUrl // Pass this key clearly
      });
      res.json({ success: true, message: "Reset link sent to your email." });
    } catch (mailErr) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      res.status(500).json({ success: false, message: "Email failed." });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// 6. RESET PASSWORD
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ success: false, message: "Invalid/expired token." });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    res.json({ success: true, message: "Password updated!" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;