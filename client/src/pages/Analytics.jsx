import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { getAllBins } from '../services/binService';
import { getAllTasks } from '../services/taskService';
import Spinner from '../components/Spinner';

// ── Colours ───────────────────────────────────────────────────────────────────
const GREEN  = '#16a34a';
const RED    = '#ef4444';
const ORANGE = '#f59e0b';
const BLUE   = '#3b82f6';
const GRAY   = '#9ca3af';

const BIN_COLORS  = { Normal: GREEN,  Warning: ORANGE, Critical: RED };
const TASK_COLORS = { Pending: GRAY, 'In-Progress': BLUE, Completed: GREEN };

// ── Generate monthly collections & alerts from real tasks ────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function buildMonthlyData(tasks) {
  const now   = new Date();
  const year  = now.getFullYear();
  return MONTHS.map((month, i) => {
    const inMonth = tasks.filter(t => {
      const d = new Date(t.timestamp);
      return d.getFullYear() === year && d.getMonth() === i;
    });
    return {
      month,
      Collections: inMonth.filter(t => t.status === 'Completed').length,
      Alerts:      inMonth.filter(t => t.status === 'Pending').length,
    };
  });
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, iconBg, valueColor }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 flex items-center gap-4">
      <div className={`${iconBg} h-12 w-12 rounded-xl flex items-center justify-center text-2xl shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-extrabold ${valueColor}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Download CSV helper ───────────────────────────────────────────────────────
function downloadCSV(monthlyData, bins, tasks) {
  const rows = [
    ['Month', 'Collections', 'Alerts'],
    ...monthlyData.map(r => [r.month, r.Collections, r.Alerts]),
    [],
    ['Bin ID', 'Fill %', 'Status'],
    ...bins.map(b => [b.binId, b.fillPercentage, b.status]),
    [],
    ['Task ID', 'Bin ID', 'Status', 'Date'],
    ...tasks.map(t => [t.taskId, t.binId, t.status, new Date(t.timestamp).toLocaleDateString()]),
  ];
  const csv  = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `smartwaste-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Settings tab placeholder ──────────────────────────────────────────────────
function SettingsTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-800">Alert Thresholds</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Normal  → Warning',  value: '50%', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
            { label: 'Warning → Critical', value: '80%', color: 'text-red-600',    bg: 'bg-red-50 border-red-200'       },
            { label: 'Auto-task trigger',  value: '80%', color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200'     },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border rounded-xl px-4 py-4`}>
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className={`text-3xl font-extrabold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400">Thresholds are fixed in the system. Contact system administrator to change them.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
        <h3 className="font-bold text-gray-800">Zone Configuration</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { zone: 'Kopargaon', emoji: '🏘️', bins: 10, emp: 4, coords: '19.885°N, 74.478°E', color: 'bg-blue-50 border-blue-200' },
            { zone: 'Shirdi',    emoji: '🛕',  bins: 12, emp: 3, coords: '19.77°N, 74.48°E',   color: 'bg-orange-50 border-orange-200' },
          ].map(z => (
            <div key={z.zone} className={`${z.color} border rounded-xl px-4 py-4 space-y-2`}>
              <p className="font-bold text-gray-800 flex items-center gap-2">{z.emoji} {z.zone}</p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div><p className="font-bold text-lg text-gray-800">{z.bins}</p><p className="text-gray-400">Bins</p></div>
                <div><p className="font-bold text-lg text-gray-800">{z.emp}</p><p className="text-gray-400">Employees</p></div>
                <div><p className="font-bold text-xs text-gray-600 mt-1">{z.coords}</p><p className="text-gray-400">Coords</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Analytics() {
  const [bins,    setBins]    = useState([]);
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('reports'); // 'reports' | 'settings'

  useEffect(() => {
    Promise.all([getAllBins(), getAllTasks()])
      .then(([b, t]) => { setBins(b.data); setTasks(t.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  // ── Derived data ────────────────────────────────────────────────────────────
  const monthlyData    = buildMonthlyData(tasks);
  const completedTasks = tasks.filter(t => t.status === 'Completed');
  const criticalBins   = bins.filter(b => b.status === 'Critical');
  const completionRate = tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
  const avgFill        = bins.length  ? Math.round(bins.reduce((s, b) => s + b.fillPercentage, 0) / bins.length) : 0;

  // Bin status pie
  const binStatusData = Object.entries(
    bins.reduce((acc, b) => { acc[b.status] = (acc[b.status] ?? 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  // Task status bar
  const taskStatusData = Object.entries(
    tasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] ?? 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  // Bin fill buckets
  const buckets = { '0–25%': 0, '26–50%': 0, '51–75%': 0, '76–100%': 0 };
  bins.forEach(b => {
    if      (b.fillPercentage <= 25) buckets['0–25%']++;
    else if (b.fillPercentage <= 50) buckets['26–50%']++;
    else if (b.fillPercentage <= 75) buckets['51–75%']++;
    else                             buckets['76–100%']++;
  });
  const fillData = Object.entries(buckets).map(([name, count]) => ({ name, count }));

  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900">Reports &amp; Settings</h2>
          <p className="text-sm text-gray-400 mt-0.5">Historical analytics and system configuration</p>
        </div>
      </div>

      {/* ── Tabs + Download ─────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setTab('reports')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'reports' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>📊</span> Reports
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'settings' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>⚙️</span> Settings
          </button>
        </div>

        {tab === 'reports' && (
          <button
            onClick={() => downloadCSV(monthlyData, bins, tasks)}
            className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            ⬇ Download CSV
          </button>
        )}
      </div>

      {/* ── Settings tab ────────────────────────────────── */}
      {tab === 'settings' && <SettingsTab />}

      {/* ── Reports tab ─────────────────────────────────── */}
      {tab === 'reports' && (
        <div className="space-y-6">

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon="🗑️" label="Total Bins"       value={bins.length}           sub="Across all zones"          iconBg="bg-gray-100"    valueColor="text-gray-800"    />
            <KpiCard icon="✅" label="Task Completion"  value={`${completionRate}%`}  sub={`${completedTasks.length} of ${tasks.length}`} iconBg="bg-green-100" valueColor="text-green-700" />
            <KpiCard icon="🔴" label="Critical Bins"    value={criticalBins.length}   sub="Needs immediate action"    iconBg="bg-red-100"     valueColor="text-red-600"     />
            <KpiCard icon="📊" label="Avg Fill Level"   value={`${avgFill}%`}         sub="Across all bins"           iconBg="bg-yellow-100"  valueColor="text-yellow-700"  />
          </div>

          {/* ── Chart 1 — Monthly Collections & Alerts ───── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
              📈 Monthly Collections &amp; Alerts
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={monthlyData}
                margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                barCategoryGap="30%"
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                <Legend
                  iconType="circle"
                  iconSize={10}
                  wrapperStyle={{ paddingTop: 16, fontSize: 13, fontWeight: 600 }}
                />
                <Bar dataKey="Collections" fill={GREEN} radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Alerts"      fill={RED}   radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Charts row 2 ─────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Bin status pie */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-base font-bold text-gray-800 mb-4">🗑️ Bin Status Distribution</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={binStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    paddingAngle={3}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {binStatusData.map(entry => (
                      <Cell key={entry.name} fill={BIN_COLORS[entry.name] ?? GRAY} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Task status bar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-base font-bold text-gray-800 mb-4">📋 Task Status Breakdown</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={taskStatusData}
                  margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                  barCategoryGap="40%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                  <Bar dataKey="value" name="Tasks" radius={[6, 6, 0, 0]} maxBarSize={52}>
                    {taskStatusData.map(entry => (
                      <Cell key={entry.name} fill={TASK_COLORS[entry.name] ?? GRAY} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Chart 3 — Fill level distribution ────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-800 mb-4">📊 Fill Level Distribution Across Bins</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={fillData}
                margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                barCategoryGap="40%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="count" name="Bins" fill={GREEN} radius={[6, 6, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Chart 4 — Monthly trend line ─────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-800 mb-4">📉 Collections Trend (This Year)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={monthlyData}
                margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                <Line
                  type="monotone" dataKey="Collections"
                  stroke={GREEN} strokeWidth={3}
                  dot={{ r: 4, fill: GREEN, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone" dataKey="Alerts"
                  stroke={RED} strokeWidth={3}
                  dot={{ r: 4, fill: RED, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

        </div>
      )}
    </div>
  );
}
