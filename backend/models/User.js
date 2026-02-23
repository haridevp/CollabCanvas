/**
 * @fileoverview User model schema definition.
 */

// Import the mongoose library to create schemas and models for MongoDB
const mongoose = require('mongoose');

/**
 * Mongoose schema for User profiles and authentication.
 * 
 * @typedef {Object} User
 * @property {string} displayName - The name displayed for the user.
 * @property {string} username - Unique username for the user.
 * @property {string} email - Unique email address for the user.
 * @property {string} password - Hashed password.
 * @property {string|null} avatar - Profile picture (Base64 string or URL).
 * @property {string} bio - User biography (max 500 characters).
 * @property {boolean} isVerified - Whether the user's email is verified.
 * @property {string} [verificationToken] - Token for email verification.
 * @property {Date} [verificationTokenExpires] - Expiration date for verification token.
 * @property {string} [resetPasswordToken] - Token for password reset.
 * @property {Date} [resetPasswordExpires] - Expiration date for reset token.
 * @property {Array<Object>} loginActivities - List of login events.
 * @property {Date} createdAt - Timestamp when the user was created.
 */
const UserSchema = new mongoose.Schema({
  // Requirement 2.2.1: Full name or preferred display name
  displayName: { type: String, required: true, trim: true },
  // Unique identification for login and profile URL; stored in lowercase
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  // Unique contact address for authentication and notifications; stored in lowercase
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  // Securely hashed password string
  password: { 
    type: String, 
    required: function() { return !this.googleId; } 
  },

  googleId: { type: String, unique: true, sparse: true },
  avatar: { type: String, default: null },
  bio: { type: String, default: '', maxLength: 500 },
  isVerified: { type: Boolean, default: false },
  
  // Requirement 2.3.2: Store profile picture (can be a Base64 string or image URL)
  avatar: { type: String, default: null },
  
  // Requirement 2.2.3: Brief user description with a character limit of 500
  bio: { type: String, default: '', maxLength: 500 },

  // Flag to indicate if the user has confirmed their email address
  isVerified: { type: Boolean, default: false },
  // Temporary string used during the email verification process
  verificationToken: String,
  // Expiration timestamp for the verification token security
  verificationTokenExpires: Date,
  // Temporary string used during the password recovery process
  resetPasswordToken: String,
  // Expiration timestamp for the reset token security
  resetPasswordExpires: Date,

  // Array to track historical login attempts for security auditing
  loginActivities: [
    {
      // Indicates if the login attempt was successful or not
      status: { type: String, enum: ['success', 'failed'], default: 'success' },
      // Optional field to categorize the source device
      deviceType: { type: String, default: 'Desktop' },
      // Timestamp of when the activity occurred
      timestamp: { type: Date, default: Date.now }
    }
  ],
  // Timestamp of when the user account was first registered
  createdAt: { type: Date, default: Date.now }
});

// Create and export the 'User' model based on the schema
module.exports = mongoose.model('User', UserSchema);

