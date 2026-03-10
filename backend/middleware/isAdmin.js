/**
 * @fileoverview Middleware to ensure the authenticated user has an 'admin' role.
 * This middleware should be used AFTER the standard 'authh' middleware.
 */

const User = require('../models/User');

module.exports = async function (req, res, next) {
  try {
    // req.user is set by the previous auth middleware
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Administrator privileges required.' });
    }

    // Role verified, proceed to the requested route
    next();
  } catch (err) {
    console.error('isAdmin middleware error:', err);
    res.status(500).json({ success: false, message: 'Server error authorizing admin' });
  }
};
