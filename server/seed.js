/**
 * Seed script — populates the smart-waste DB with realistic fake data.
 * Run:  node seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Bin  = require('./models/Bin');
const Task = require('./models/Task');
const User = require('./models/User');

// ── Helpers ──────────────────────────────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pad  = (prefix, n) => `${prefix}-${String(n).padStart(3, '0')}`;

// ── Pune city zones (realistic coordinates) ──────────────────────────────────
const ZONES = [
  { name: 'Koregaon Park',   lat: 18.5362, lng: 73.8943 },
  { name: 'Shivajinagar',    lat: 18.5308, lng: 73.8474 },
  { name: 'Kothrud',         lat: 18.5074, lng: 73.8077 },
  { name: 'Hadapsar',        lat: 18.5018, lng: 73.9260 },
  { name: 'Aundh',           lat: 18.5590, lng: 73.8076 },
  { name: 'Wakad',           lat: 18.5986, lng: 73.7619 },
  { name: 'Viman Nagar',     lat: 18.5679, lng: 73.9143 },
  { name: 'Baner',           lat: 18.5590, lng: 73.7868 },
  { name: 'Magarpatta',      lat: 18.5123, lng: 73.9308 },
  { name: 'Deccan Gymkhana', lat: 18.5161, lng: 73.8469 },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅  MongoDB connected');

  // ── Wipe existing data ─────────────────────────────────────────────────────
  await Bin.deleteMany({});
  await Task.deleteMany({});
  await User.deleteMany({});
  console.log('🗑️   Cleared existing collections');

  // ── 1. Users (pre-save hook handles hashing) ──────────────────────────────
  const usersPayload = [
    { name: 'Admin User',     email: 'admin@smartwaste.com',  password: 'admin123',  role: 'admin'    },
    { name: 'Ravi Sharma',    email: 'ravi@smartwaste.com',   password: 'emp123',    role: 'employee' },
    { name: 'Priya Deshmukh', email: 'priya@smartwaste.com',  password: 'emp123',    role: 'employee' },
    { name: 'Amit Kulkarni',  email: 'amit@smartwaste.com',   password: 'emp123',    role: 'employee' },
    { name: 'Sunita Pawar',   email: 'sunita@smartwaste.com', password: 'emp123',    role: 'employee' },
    { name: 'Rohit Jadhav',   email: 'rohit@smartwaste.com',  password: 'emp123',    role: 'employee' },
    { name: 'Meena Patil',    email: 'meena@smartwaste.com',  password: 'emp123',    role: 'employee' },
    { name: 'Karan Bhosale',  email: 'karan@smartwaste.com',  password: 'emp123',    role: 'employee' },
  ];

  const users = [];
  for (const u of usersPayload) {
    const doc = new User(u);
    await doc.save(); // triggers bcrypt pre-save hook
    users.push(doc);
  }
  const employees = users.filter(u => u.role === 'employee');
  console.log(`👤  Seeded ${users.length} users (1 admin + ${employees.length} employees)`);

  // ── 2. Bins ────────────────────────────────────────────────────────────────
  //  Spread bins across Pune zones; force a good mix of statuses
  const fillDistribution = [
    // Ensure at least some of each status
    ...Array(8).fill(null).map(() => rand(81, 100)),  // Critical
    ...Array(8).fill(null).map(() => rand(51, 80)),   // Warning
    ...Array(8).fill(null).map(() => rand(0,  50)),   // Normal
  ];

  const binDocs = [];
  let binIdx = 1;

  for (const zone of ZONES) {
    const count = rand(2, 4);
    for (let i = 0; i < count; i++) {
      const fill = fillDistribution.length
        ? fillDistribution.splice(rand(0, fillDistribution.length - 1), 1)[0]
        : rand(0, 100);

      // Small lat/lng jitter so bins within a zone don't stack
      const lat = parseFloat((zone.lat + (Math.random() - 0.5) * 0.012).toFixed(6));
      const lng = parseFloat((zone.lng + (Math.random() - 0.5) * 0.012).toFixed(6));

      const bin = new Bin({
        binId:          pad('BIN', binIdx++),
        location:       { lat, lng },
        fillPercentage: fill,
        // status derived automatically by pre-save hook
        lastUpdated:    new Date(Date.now() - rand(0, 3_600_000)),
      });
      await bin.save();
      binDocs.push(bin);
    }
  }

  const critical = binDocs.filter(b => b.status === 'Critical');
  const warning  = binDocs.filter(b => b.status === 'Warning');
  const normal   = binDocs.filter(b => b.status === 'Normal');
  console.log(`🗑️   Seeded ${binDocs.length} bins — ${critical.length} Critical · ${warning.length} Warning · ${normal.length} Normal`);

  // ── 3. Tasks ───────────────────────────────────────────────────────────────
  const tasks = [];
  let taskIdx = 1;

  // --- Completed tasks (historical, spread over last 7 days) ---
  for (let i = 0; i < 14; i++) {
    const bin = pick(binDocs);
    const emp = pick(employees);
    tasks.push({
      taskId:             pad('TASK', taskIdx++),
      binId:              bin.binId,
      assignedEmployeeId: emp._id,
      status:             'Completed',
      timestamp:          new Date(Date.now() - rand(1, 7) * 86_400_000),
    });
  }

  // --- In-Progress tasks — assigned to a few critical bins ---
  const inProgressBins = critical.slice(0, Math.min(3, critical.length));
  for (const bin of inProgressBins) {
    const emp = pick(employees);
    tasks.push({
      taskId:             pad('TASK', taskIdx++),
      binId:              bin.binId,
      assignedEmployeeId: emp._id,
      status:             'In-Progress',
      timestamp:          new Date(Date.now() - rand(0, 7_200_000)),
    });
  }

  // --- Pending tasks — unassigned, waiting for dispatch ---
  const pendingBins = [
    ...critical.slice(inProgressBins.length),            // remaining critical
    ...warning.slice(0, Math.min(4, warning.length)),    // some warning bins too
  ];
  for (const bin of pendingBins) {
    tasks.push({
      taskId:             pad('TASK', taskIdx++),
      binId:              bin.binId,
      assignedEmployeeId: null,
      status:             'Pending',
      timestamp:          new Date(Date.now() - rand(0, 1_800_000)),
    });
  }

  await Task.insertMany(tasks);
  const doneCount       = tasks.filter(t => t.status === 'Completed').length;
  const inProgCount     = tasks.filter(t => t.status === 'In-Progress').length;
  const pendCount       = tasks.filter(t => t.status === 'Pending').length;
  console.log(`📋  Seeded ${tasks.length} tasks — ${doneCount} Completed · ${inProgCount} In-Progress · ${pendCount} Pending`);

  // ── Done ───────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉  Seed complete! Login at http://localhost:5173/login');
  console.log('    Admin    →  admin@smartwaste.com  /  admin123');
  console.log('    Employee →  ravi@smartwaste.com   /  emp123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌  Seed failed:', err.message);
  process.exit(1);
});
