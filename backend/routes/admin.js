/**
 * @fileoverview Admin routes for managing platform data.
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authh = require('../middleware/authh');
const isAdmin = require('../middleware/isAdmin');
const { Room } = require('../models/Room');

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get aggregate stats and recent users for the admin dashboard
 * @access  Private (Admin only)
 */
router.get('/dashboard', [authh, isAdmin], async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    let totalRooms = 0;
    
    // Check if Room model exists/is exported correctly before counting
    if (Room && typeof Room.countDocuments === 'function') {
      totalRooms = await Room.countDocuments();
    } else {
      console.warn("Room model not fully initialized yet or not exported correctly.");
    }

    // Get the most recent 50 users
    const recentUsers = await User.find({})
      .select('-password -loginActivities') // Exclude sensitive fields
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalRooms
      },
      users: recentUsers
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to load admin dashboard data' });
  }
});

/**
 * @route   PUT /api/admin/users/:id/role
 * @desc    Change a user's role
 * @access  Private (Admin only)
 */
router.put('/users/:id/role', [authh, isAdmin], async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role specified' });
    }

    // Prevent changing your own role (to avoid accidentally locking yourself out)
    if (req.user.id === req.params.id) {
       return res.status(400).json({ success: false, message: 'You cannot change your own role.' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    targetUser.role = role;
    await targetUser.save();

    res.json({ 
      success: true, 
      message: `User ${targetUser.email} role updated to ${role}.` 
    });

  } catch (error) {
    console.error('Error changing user role:', error);
    res.status(500).json({ success: false, message: 'Failed to update user role' });
  }
});

/**
 * @route   GET /api/admin/make-me-admin
 * @desc    Temporary emergency route to promote the requesting user to admin
 * @access  Public (Emergency use only)
 */
router.get('/make-me-admin', async (req, res) => {
  try {
     const email = req.query.email;
     if (!email) return res.status(400).send('<h1>Please provide ?email=your_email in the URL</h1>');

     const user = await User.findOne({ email: email.toLowerCase() });
     if (!user) return res.status(404).send('<h1>User not found</h1>');
     
     user.role = 'admin';
     await user.save();
     
     res.send(`<h1>Success!</h1><p>${user.email} is now an admin. Please <strong>Log out and Log back in</strong> in the app to see the changes.</p><a href="http://localhost:5173/CollabCanvas/dashboard">Return to App</a>`);
  } catch (err) {
     res.status(500).send(`<h1>Error</h1><p>${err.message}</p>`);
  }
});

module.exports = router;
