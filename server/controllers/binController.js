const Bin = require('../models/Bin');
const Task = require('../models/Task');
const { v4: uuidv4 } = require('uuid');

// ─────────────────────────────────────────────
// POST /api/bins/update
// Receives sensor data from ESP32, updates fill
// percentage and auto-derives status.
// ─────────────────────────────────────────────
const updateBin = async (req, res) => {
  try {
    const { binId, fillPercentage, lat, lng } = req.body;

    if (binId === undefined || fillPercentage === undefined) {
      return res.status(400).json({
        success: false,
        message: 'binId and fillPercentage are required',
      });
    }

    if (fillPercentage < 0 || fillPercentage > 100) {
      return res.status(400).json({
        success: false,
        message: 'fillPercentage must be between 0 and 100',
      });
    }

    // Upsert: create the bin if it doesn't exist yet
    let bin = await Bin.findOne({ binId });

    if (!bin) {
      if (lat === undefined || lng === undefined) {
        return res.status(400).json({
          success: false,
          message: 'lat and lng are required when registering a new bin',
        });
      }
      bin = new Bin({ binId, location: { lat, lng }, fillPercentage });
    } else {
      bin.fillPercentage = fillPercentage;
      // Allow location update if provided
      if (lat !== undefined && lng !== undefined) {
        bin.location = { lat, lng };
      }
    }

    const previousStatus = bin.status;
    await bin.save(); // pre-save hook re-derives status

    // Auto-create a task when bin transitions into Critical
    if (bin.status === 'Critical' && previousStatus !== 'Critical') {
      const existingPendingTask = await Task.findOne({
        binId,
        status: { $in: ['Pending', 'In-Progress'] },
      });

      if (!existingPendingTask) {
        await Task.create({
          taskId: `TASK-${uuidv4().slice(0, 8).toUpperCase()}`,
          binId,
          status: 'Pending',
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Bin updated successfully',
      data: bin,
    });
  } catch (error) {
    console.error('updateBin error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/bins
// Return all bins (supports ?status= filter)
// ─────────────────────────────────────────────
const getAllBins = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      const allowed = ['Normal', 'Warning', 'Critical'];
      if (!allowed.includes(req.query.status)) {
        return res.status(400).json({ success: false, message: 'Invalid status filter' });
      }
      filter.status = req.query.status;
    }

    const bins = await Bin.find(filter).sort({ lastUpdated: -1 });
    return res.status(200).json({ success: true, count: bins.length, data: bins });
  } catch (error) {
    console.error('getAllBins error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/bins/critical
// Fetch all critical bins and their open tasks
// (admin use – dispatching decisions)
// ─────────────────────────────────────────────
const getCriticalBins = async (req, res) => {
  try {
    const criticalBins = await Bin.find({ status: 'Critical' }).sort({ lastUpdated: -1 });

    // Attach any open tasks to each bin
    const binIds = criticalBins.map((b) => b.binId);
    const openTasks = await Task.find({
      binId: { $in: binIds },
      status: { $in: ['Pending', 'In-Progress'] },
    }).populate('assignedEmployeeId', 'name email');

    const taskMap = openTasks.reduce((acc, task) => {
      if (!acc[task.binId]) acc[task.binId] = [];
      acc[task.binId].push(task);
      return acc;
    }, {});

    const result = criticalBins.map((bin) => ({
      ...bin.toObject(),
      openTasks: taskMap[bin.binId] || [],
    }));

    return res.status(200).json({ success: true, count: result.length, data: result });
  } catch (error) {
    console.error('getCriticalBins error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/bins/:binId
// Fetch a single bin by binId
// ─────────────────────────────────────────────
const getBinById = async (req, res) => {
  try {
    const bin = await Bin.findOne({ binId: req.params.binId });
    if (!bin) {
      return res.status(404).json({ success: false, message: 'Bin not found' });
    }
    return res.status(200).json({ success: true, data: bin });
  } catch (error) {
    console.error('getBinById error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { updateBin, getAllBins, getCriticalBins, getBinById };
