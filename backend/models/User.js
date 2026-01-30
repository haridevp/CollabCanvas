const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  // --- NEW: Verification Fields ---
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationTokenExpires: Date,
  // Add these to your existing UserSchema
  resetPasswordToken: String,
  resetPasswordExpires: Date,

  loginActivities: [
    {
      status: { type: String, enum: ['success', 'failed'], default: 'success' },
      deviceType: { type: String, default: 'Desktop' },
      timestamp: { type: Date, default: Date.now }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);