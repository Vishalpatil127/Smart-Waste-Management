const User = require('../models/User');

// GET /api/users  — admin: list all users, optionally filtered by ?role=
const getAllUsers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) {
      const allowed = ['admin', 'employee'];
      if (!allowed.includes(req.query.role)) {
        return res.status(400).json({ success: false, message: 'Invalid role filter' });
      }
      filter.role = req.query.role;
    }
    // Never return passwords
    const users = await User.find(filter).select('-password').sort({ name: 1 });
    return res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error('getAllUsers error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// GET /api/users/:id
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('getUserById error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { getAllUsers, getUserById };
