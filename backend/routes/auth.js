/**
 * @fileoverview Authentication routes for user registration, login, profile management, and password recovery.
 */

// Import express to define routing logic
const express = require("express");
// Create a new router instance to attach routes
const router = express.Router();
// Import bcryptjs for secure password comparison and hashing
const bcrypt = require("bcryptjs");
// Import jsonwebtoken to generate session tokens
const jwt = require("jsonwebtoken");
// Import crypto for generating random secure tokens for verification/resets
const crypto = require("crypto");
// Import the User model to interact with the database
const User = require("../models/User");
// Import the email utility for sending notifications/tokens
const sendEmail = require("../utils/sendEmail");
// Import the auth middleware to protect specific routes
const authh = require("../middleware/authh");
// Import asyncHandler to clean up try/catch blocks in route handlers
const { asyncHandler } = require("../middleware/errorHandler");

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * @route   POST /api/auth/google-login
 * @desc    Authenticate or Register user via Google OAuth
 * @access  Public
 */
router.post("/google-login", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, message: "No Google credential provided" });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

    if (!user) {
      const baseUsername = name.replace(/\s+/g, '').toLowerCase();
      const uniqueUsername = `${baseUsername}${Math.floor(Math.random() * 1000)}`;

      user = new User({
        displayName: name,
        username: uniqueUsername,
        email: email.toLowerCase(),
        googleId,
        avatar: picture,
        isVerified: true, 
      });
      await user.save();
    } else if (!user.googleId) {
      user.googleId = googleId;
      if (!user.avatar) user.avatar = picture;
      user.isVerified = true;
      await user.save();
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.displayName,
        avatar: user.avatar,
        bio: user.bio,
      },
    });
  } catch (err) {
    console.error("❌ GOOGLE AUTH CRITICAL ERROR:", err.message);
    res.status(400).json({ success: false, message: "Google verification failed: " + err.message });
  }
});

/**
 * @route   GET /api/auth/check-username/:username
 * @desc    Check if a username is available for registration.
 * @access  Public
 */
router.get("/check-username/:username", async (req, res) => {
  try {
    // Attempt to find a user with the provided username (case-insensitive and trimmed)
    const user = await User.findOne({
      username: req.params.username.toLowerCase().trim(),
    });
    // If a user exists, the name is not available
    if (user) {
      // Respond with a 200 OK but indicating unavailability
      return res.json({
        available: false,
        message: "Username is taken",
        // Provide alternative name suggestions using random numbers or suffixes
        suggestions: [
          `${req.params.username}${Math.floor(Math.random() * 100)}`,
          `${req.params.username}_canvas`,
        ],
      });
    }
    // Respond that the name is available for use
    res.json({ available: true, message: "Username is available!" });
  } catch (err) {
    // Catch server errors and return a 500 status code
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @route   GET /api/auth/profile
 * @desc    Get the current user's profile information.
 * @access  Private
 */
router.get("/profile", authh, async (req, res) => {
  try {
    // Find the user details using the ID attached to the request by the 'authh' middleware
    const user = await User.findById(req.user.id);
    // If the record is missing, return a 404 error
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Respond with success and the sanitized user profile data
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.displayName,
        displayName: user.displayName,
        avatar: user.avatar,
        bio: user.bio,
      },
    });
  } catch (err) {
    // Catch server/database errors and respond with a 500 status
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user and send a verification email.
 * @access  Public
 */
router.post("/register", async (req, res) => {
  try {
    // Destructure required fields from the incoming request body
    const { fullName, username, email, password } = req.body;

    // Check the database for any existing user with the same email or username (case-insensitive)
    const existingUser = await User.findOne({
      $or: [{ email }, { username: username.toLowerCase() }],
    });
    // If a conflict is found, refuse registration with a 400 status
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email or Username already taken" });
    }

    // Generate a secure cryptographic salt
    const salt = await bcrypt.genSalt(10);
    // Hash the plain text password using the generated salt
    const hashedPassword = await bcrypt.hash(password, salt);
    // Create a random hex string to be used as a one-time verification token
    const verificationToken = crypto.randomBytes(20).toString("hex");

    // Initialize a new User document with provided and generated data
    const newUser = new User({
      displayName: fullName,
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      isVerified: false,
      verificationToken,
      // Set the token to expire in 24 hours
      verificationTokenExpires: Date.now() + 24 * 3600000,
    });

    // Save the new user record to the database
    await newUser.save();

    // Use environment variables to build the absolute URL for the verification link
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

    try {
      // Attempt to send the verification email to the user
      await sendEmail({
        email: newUser.email,
        subject: "Confirm your Collaborative Canvas Account",
        verificationUrl: verificationUrl, 
      });
    } catch (mailErr) {
      // Log failure in mail delivery
      console.log("⚠️ Mail Delivery Failed:", mailErr.message);
      // Rollback: delete the newly created user record so they aren't stuck in an unverified state
      await User.findByIdAndDelete(newUser._id);
      // Return a 500 error to the client
      return res.status(500).json({ 
        success: false, 
        message: "Failed to send verification email. Please try again." 
      });
    }

    // Respond with success and instructions for the user
    res
      .status(201)
      .json({
        success: true,
        message: "Registration successful! Please check your email.",
      });
  } catch (err) {
    // Log unexpected errors during registration
    console.error("❌ REGISTRATION ERROR:", err.message);
    // Respond with 400 status and the error message
    res
      .status(400)
      .json({ success: false, message: "Registration failed: " + err.message });
  }
});

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify a user's email using a token.
 * @access  Public
 */
router.post("/verify-email", async (req, res) => {
  try {
    // Extract the verification token from the request body
    const { token } = req.body;
    // Return error if token is missing
    if (!token)
      return res
        .status(400)
        .json({ success: false, message: "Missing token." });

    // Look for a user with the provided token that hasn't expired yet
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    // If no user found or token expired, check if they are already verified
    if (!user) {
      // Look for a verified user (token fields would have been cleared)
      const alreadyVerified = await User.findOne({
        verificationToken: undefined,
        isVerified: true,
      });
      // If already verified, inform the user
      if (alreadyVerified)
        return res.json({
          success: true,
          message: "Account already verified.",
        });
      // Otherwise, the token is simply invalid or too old
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token." });
    }

    // Mark the account as active and verified
    user.isVerified = true;
    // Clear the verification fields as they are no longer needed
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    // Update the database
    await user.save();

    // Respond with success
    res.json({ success: true, message: "Account successfully activated!" });
  } catch (err) {
    // Log unexpected failures and return a 500 status
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return a JWT token.
 * @access  Public
 */
router.post("/login", async (req, res) => {
  try {
    // Extract credentials from the request body
    const { email, password } = req.body;
    // Attempt to locate the user by their email address
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // If the user record doesn't exist, deny access
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    // If the user hasn't verified their email, deny access
    if (!user.isVerified)
      return res
        .status(403)
        .json({ success: false, message: "Please verify your email." });

    // Securely compare the provided password with the stored hash
    const isMatch = await bcrypt.compare(password, user.password);
    // If the password doesn't match, deny access
    if (!isMatch)
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });

    // Track successful login activity in the database
    user.loginActivities.push({ status: "success", timestamp: new Date() });
    // Commit the activity update
    await user.save();

    // Generate a JWT signed with the user's ID and the secret key
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      // Set the token to expire in one day
      expiresIn: "1d",
    });

    // Send the token and sanitized user profile info back to the client
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.displayName,
        avatar: user.avatar, 
        bio: user.bio, 
      },
    });
  } catch (err) {
    // Log failures and return error status
    res.status(500).json({ success: false, message: "Login failed" });
  }
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request a password reset link.
 * @access  Public
 */
router.post("/forgot-password", async (req, res) => {
  try {
    // Extract the email for which to reset the password
    const { email } = req.body;
    // Find the user associated with that email
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // For security, always claim success even if the email doesn't exist
    if (!user)
      return res.json({
        success: true,
        message: "If an account exists, a reset link has been sent.",
      });

    // Generate a random temporary reset token
    const resetToken = crypto.randomBytes(20).toString("hex");
    // Attach the token to the user record
    user.resetPasswordToken = resetToken;
    // Set an expiration of one hour for the token
    user.resetPasswordExpires = Date.now() + 3600000;
    // Update the record
    await user.save();

    // Use the frontend URL from environment configuration
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    // Construct the absolute reset link
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    try {
      // Attempt to send the recovery email
      await sendEmail({
        email: user.email,
        subject: "Password Reset Request",
        resetUrl: resetUrl, 
      });
      // Respond with confirmation
      res.json({ success: true, message: "Reset link sent to your email." });
    } catch (mailErr) {
      // If email delivery fails, roll back the security tokens on the user record
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      // Inform the client of the failure
      res.status(500).json({ success: false, message: "Email failed." });
    }
  } catch (err) {
    // Return a 500 status for unexpected server errors
    res.status(500).json({ success: false, message: "Server error." });
  }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset a user's password using a token.
 * @access  Public
 */
router.post("/reset-password", async (req, res) => {
  try {
    // Extract the recovery token and new password from the request
    const { token, password } = req.body;
    // Look for a user with that active token that hasn't expired
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    // If the token is invalid or too old, refuse the request
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Invalid/expired token." });

    // Generate a fresh salt
    const salt = await bcrypt.genSalt(10);
    // Securely hash the new password
    user.password = await bcrypt.hash(password, salt);
    // Clear the recovery fields so the token cannot be reused
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    // Update the database record
    await user.save();
    // Confirm password update to the user
    res.json({ success: true, message: "Password updated!" });
  } catch (err) {
    // Return error on unexpected database failures
    res.status(500).json({ success: false, message: "Server error." });
  }
});

/**
 * @route   DELETE /api/auth/delete-account
 * @desc    Permanently delete the current user's account.
 * @access  Private
 */
router.delete("/delete-account", authh, async (req, res) => {
  try {
    // Extract the password from the request body for one-time verification
    const { password } = req.body;

    // Retrieve the user record attached by the authentication middleware
    const user = req.user;

    // Securely compare the provided password with the stored hash
    const isMatch = await bcrypt.compare(password, user.password);
    // If the password is incorrect, refuse the deletion for security
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password. Account deletion denied.",
      });
    }

    // Remove the user document from the database permanently
    await User.findByIdAndDelete(user._id);

    // Respond with success to confirm deletion
    res.json({
      success: true,
      message: "Account permanently deleted. Session cleared.",
    });
  } catch (err) {
    // Log unexpected errors during account removal
    console.error("❌ DELETION ERROR:", err.message);
    // Return a 500 error status
    res.status(500).json({
      success: false,
      message: "Server error during account deletion.",
    });
  }
});

/**
 * @route   PUT /api/auth/update-profile
 * @desc    Update the current user's profile info (display name, bio, avatar).
 * @access  Private
 */
router.put("/update-profile", authh, async (req, res) => {
  try {
    // Destructure updateable fields from the request body
    const { displayName, bio, avatar } = req.body;
    // Find the user record from the database using the ID from the token
    const user = await User.findById(req.user.id);

    // If the user record is missing, return a 404 error
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // Validate that the new display name meets length requirements (3-50 chars)
    if (displayName && (displayName.length < 3 || displayName.length > 50)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Display name must be 3-50 characters",
        });
    }

    // Update the display name if provided
    if (displayName) user.displayName = displayName;
    // Update the biography if provided (including empty string)
    if (bio !== undefined) user.bio = bio;
    // Update the avatar if provided (including null)
    if (avatar !== undefined) user.avatar = avatar;

    // Save the updated document to the database
    await user.save();

    // Respond with success and the updated profile data
    res.json({
      success: true,
      message: "Profile updated successfully!",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.displayName, 
        bio: user.bio,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    // Return a 500 status on unexpected server failures
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * @route   GET /api/auth/search
 * @desc    Search for users by username or display name.
 * @access  Private
 */
router.get("/search", authh, async (req, res) => {
  try {
    // Extract the search query 'q' from request parameters
    const { q } = req.query;

    // Validate that the query exists and is at least 2 characters long
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    // Execute a case-insensitive regex search on username and display name fields
    const users = await User.find({
      $and: [
        {
          $or: [
            // Check if the username contains the query string
            { username: { $regex: q, $options: "i" } },
            // Check if the display name contains the query string
            { displayName: { $regex: q, $options: "i" } },
          ],
        },
        // Filter out the requesting user's own profile from the results
        { _id: { $ne: req.user._id } }, 
      ],
    })
      // Only retrieve necessary public fields for the search results
      .select("_id username displayName email avatar")
      // Cap the results at 20 to preserve performance
      .limit(20);

    // Respond with the list of matching users mapped to a consistent format
    res.json({
      success: true,
      users: users.map((user) => ({
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
      })),
    });
  } catch (err) {
    // Log failures and return a 500 error status
    console.error("Search error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;

