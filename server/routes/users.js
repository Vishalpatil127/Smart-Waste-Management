const express = require('express');
const router = express.Router();
const { getAllUsers, getUserById } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// GET /api/users         — admin only
router.get('/', authorize('admin'), getAllUsers);

// GET /api/users/:id     — admin only
router.get('/:id', authorize('admin'), getUserById);

module.exports = router;
