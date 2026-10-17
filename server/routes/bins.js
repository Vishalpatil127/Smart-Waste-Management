const express = require('express');
const router = express.Router();
const { updateBin, getAllBins, getCriticalBins, getBinById } = require('../controllers/binController');
const { protect, authorize } = require('../middleware/auth');

// POST /api/bins/update  — ESP32 sensor data ingestion (no auth required for IoT devices)
router.post('/update', updateBin);

// GET /api/bins/critical — admin: fetch all critical bins with open tasks
router.get('/critical', protect, authorize('admin'), getCriticalBins);

// GET /api/bins          — all bins (admin & employee)
router.get('/', protect, getAllBins);

// GET /api/bins/:binId   — single bin
router.get('/:binId', protect, getBinById);

module.exports = router;
