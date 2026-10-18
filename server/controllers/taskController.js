const Task = require('../models/Task');
const User = require('../models/User');
const Bin = require('../models/Bin');
const { v4: uuidv4 } = require('uuid');

// ─────────────────────────────────────────────
// GET /api/tasks
// List all tasks (optional ?status= filter)
// ─────────────────────────────────────────────
const getAllTasks = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      const allowed = ['Pending', 'In-Progress', 'Completed'];
      if (!allowed.includes(req.query.status)) {
        return res.status(400).json({ success: false, message: 'Invalid status filter' });
      }
      filter.status = req.query.status;
    }

    const tasks = await Task.find(filter)
      .populate('assignedEmployeeId', 'name email role')
      .sort({ timestamp: -1 });

    return res.status(200).json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    console.error('getAllTasks error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/tasks
// Create a task manually (admin)
// Auto-registers bin in MongoDB if it only exists in RTDB (ESP32-only bins).
// Optionally assigns employee in the same request if assignedEmployeeId provided.
// ─────────────────────────────────────────────
const createTask = async (req, res) => {
  try {
    const { binId, assignedEmployeeId, fillPercentage, lat, lng } = req.body;

    if (!binId) {
      return res.status(400).json({ success: false, message: 'binId is required' });
    }

    // ── Upsert bin: find in MongoDB or auto-register from RTDB data ──────
    let bin = await Bin.findOne({ binId });

    if (!bin) {
      const fill = fillPercentage != null ? Number(fillPercentage) : 0;
      // Use provided coords; fall back to Kopargaon centre so validation passes
      const location = (lat != null && lng != null)
        ? { lat: Number(lat), lng: Number(lng) }
        : { lat: 19.8824, lng: 74.4761 };

      try {
        bin = new Bin({ binId, location, fillPercentage: fill });
        await bin.save();
      } catch (saveErr) {
        // If unique-key race condition (concurrent requests), just re-fetch
        bin = await Bin.findOne({ binId });
        if (!bin) throw saveErr;
      }
    }

    // ── Validate employee if provided ─────────────────────────────────────
    if (assignedEmployeeId) {
      const employee = await User.findById(assignedEmployeeId);
      if (!employee || employee.role !== 'employee') {
        return res.status(404).json({ success: false, message: 'Employee not found' });
      }
    }

    // ── Create task (and assign immediately if employee given) ────────────
    const task = await Task.create({
      taskId:             `TASK-${uuidv4().slice(0, 8).toUpperCase()}`,
      binId,
      assignedEmployeeId: assignedEmployeeId || null,
      status:             assignedEmployeeId ? 'In-Progress' : 'Pending',
      timestamp:          new Date(),
    });

    return res.status(201).json({ success: true, message: 'Task created', data: task });
  } catch (error) {
    console.error('createTask error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─────────────────────────────────────────────
// PATCH /api/tasks/:taskId/assign
// Assign an employee to a task (admin)
// ─────────────────────────────────────────────
const assignTask = async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'employeeId is required' });
    }

    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== 'employee') {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const task = await Task.findOne({ taskId: req.params.taskId });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.status === 'Completed') {
      return res.status(400).json({ success: false, message: 'Cannot reassign a completed task' });
    }

    task.assignedEmployeeId = employeeId;
    task.status = 'In-Progress';
    await task.save();

    return res.status(200).json({ success: true, message: 'Task assigned', data: task });
  } catch (error) {
    console.error('assignTask error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─────────────────────────────────────────────
// PATCH /api/tasks/:taskId/status
// Update task status (employee or admin)
// ─────────────────────────────────────────────
const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Pending', 'In-Progress', 'Completed'];

    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Valid status is required' });
    }

    const task = await Task.findOne({ taskId: req.params.taskId });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.status = status;
    await task.save();

    // When task is completed, reset bin fill percentage to 0
    if (status === 'Completed') {
      await Bin.findOneAndUpdate(
        { binId: task.binId },
        { fillPercentage: 0, status: 'Normal', lastUpdated: new Date() }
      );
    }

    return res.status(200).json({ success: true, message: 'Task status updated', data: task });
  } catch (error) {
    console.error('updateTaskStatus error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/tasks/:taskId
// Fetch a single task
// ─────────────────────────────────────────────
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findOne({ taskId: req.params.taskId }).populate(
      'assignedEmployeeId',
      'name email role'
    );
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    return res.status(200).json({ success: true, data: task });
  } catch (error) {
    console.error('getTaskById error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { getAllTasks, createTask, assignTask, updateTaskStatus, getTaskById };
