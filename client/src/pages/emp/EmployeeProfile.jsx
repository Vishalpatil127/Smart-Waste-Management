import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAllTasks } from '../../services/taskService';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────
const ZONE = {
  kopargaon: {
    label:    'Kopargaon Zone',
    emoji:    '🏘️',
    desc:     'Ahmednagar district · Godavari River belt',
    coords:   '19.885°N, 74.478°E',
    pop:      '65,273',
    district: 'Ahmednagar, Maharashtra',
    note:     'Known for Daityaguru Shukracharya temple and Datta Par site.',
    from:  'from-blue-500', to: 'to-blue-700',
    ring:  'ring-blue-400',
    chip:  'bg-blue-100 text-blue-700',
    tile:  'bg-blue-50  border-blue-100',
    head:  'text-blue-700',
  },
  shirdi: {
    label:    'Shirdi Zone',
    emoji:    '🛕',
    desc:     'Famous pilgrimage city · Sai Baba Samadhi Mandir',
    coords:   '19.77°N, 74.48°E',
    pop:      '36,004',
    district: 'Ahmednagar, Maharashtra',
    note:     "One of India's most visited pilgrimage destinations.",
    from:  'from-orange-400', to: 'to-orange-600',
    ring:  'ring-orange-400',
    chip:  'bg-orange-100 text-orange-700',
    tile:  'bg-orange-50  border-orange-100',
    head:  'text-orange-700',
  },
};

const AV_COLORS = ['bg-violet-500','bg-teal-500','bg-rose-500','bg-cyan-600','bg-amber-500','bg-indigo-500'];
const avColor = (n = '') => AV_COLORS[n.charCodeAt(0) % AV_COLORS.length];

// ─────────────────────────────────────────────────────────────────────────────
// Small reusable pieces
// ─────────────────────────────────────────────────────────────────────────────
function Chip({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${className}`}>
      {children}
    </span>
  );
}

function StatBox({ icon, value, label, valColor = 'text-gray-800' }) {
  return (
    <div className="flex flex-col items-center gap-1 py-5">
      <span className="text-2xl leading-none">{icon}</span>
      <span className={`text-3xl font-black leading-none tracking-tight ${valColor}`}>{value}</span>
      <span className="text-xs text-gray-400 font-medium mt-0.5">{label}</span>
    </div>
  );
}

function ZoneTile({ label, value, zone }) {
  return (
    <div className={`${zone.tile} border rounded-2xl px-4 py-3`}>
      <p className={`text-xs font-bold uppercase tracking-wider ${zone.head} opacity-80 mb-1`}>{label}</p>
      <p className="text-sm font-semibold text-gray-800 leading-snug">{value}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function EmployeeProfile() {
  const { user } = useAuth();
  const zone     = ZONE[user?.zone] ?? null;

  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllTasks()
      .then(res => setTasks(
        res.data.filter(t =>
          String(t.assignedEmployeeId?._id ?? t.assignedEmployeeId) === String(user?._id)
        )
      ))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <Spinner />;

  const completed = tasks.filter(t => t.status === 'Completed');
  const active    = tasks.filter(t => t.status !== 'Completed');
  const rate      = tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0;

  // streak
  const dates = [...new Set(completed.map(t => new Date(t.updatedAt ?? t.timestamp).toDateString()))]
    .sort((a, b) => new Date(b) - new Date(a));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < dates.length; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (dates[i] === d.toDateString()) streak++;
    else break;
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">

      {/* ══════════════════════════════════════════════════
          HERO CARD
      ══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Banner */}
        <div className={`h-28 bg-gradient-to-br ${zone?.from ?? 'from-gray-500'} ${zone?.to ?? 'to-gray-700'} relative`}>
          {/* subtle circles */}
          <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-white/10 translate-x-8 -translate-y-8" />
          <div className="absolute right-16 bottom-0 h-16 w-16 rounded-full bg-white/10 translate-y-4" />
          {zone && (
            <div className="absolute bottom-3 right-4 flex items-center gap-1.5 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full">
              <span className="text-sm">{zone.emoji}</span>
              <span className="text-xs font-bold text-white">{zone.label}</span>
            </div>
          )}
        </div>

        {/* Identity block */}
        <div className="px-6 pb-6">
          {/* Avatar — sits half over the banner */}
          <div className="flex items-end justify-between -mt-9 mb-4">
            <div className={`h-18 w-18 ${avColor(user?.name)} ring-4 ring-white shadow-xl
              rounded-2xl flex items-center justify-center text-white text-3xl font-black
              select-none shrink-0`}
              style={{ height: 72, width: 72 }}>
              {user?.name?.[0]?.toUpperCase() ?? 'E'}
            </div>
            {/* Status pill top-right */}
            <Chip className={user?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}>
              <span className={`h-2 w-2 rounded-full ${user?.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
              {user?.isActive ? 'Active' : 'Inactive'}
            </Chip>
          </div>

          {/* Name + email */}
          <h2 className="text-xl font-black text-gray-900 leading-tight">{user?.name}</h2>
          <p className="text-sm text-gray-400 mt-0.5 mb-4">{user?.email}</p>

          {/* Chip row */}
          <div className="flex flex-wrap gap-2">
            <Chip className="bg-gray-100 text-gray-600">👷 Employee</Chip>
            {zone && <Chip className={zone.chip}>{zone.emoji} {zone.label}</Chip>}
            {user?.createdAt && (
              <Chip className="bg-purple-50 text-purple-600">
                📅 Since {new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </Chip>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          PERFORMANCE
      ══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <p className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2">
          📊 Performance
        </p>

        {/* Stat grid with dividers */}
        <div className="grid grid-cols-4 divide-x divide-gray-100 bg-gray-50 rounded-2xl overflow-hidden mb-5">
          <StatBox icon="📋" value={tasks.length}     label="Total Tasks"  valColor="text-gray-800"   />
          <StatBox icon="✅" value={completed.length} label="Completed"    valColor="text-green-600"  />
          <StatBox icon="🔄" value={active.length}    label="Active"       valColor="text-blue-600"   />
          <StatBox icon="🔥" value={streak}           label="Day Streak"   valColor="text-orange-500" />
        </div>

        {/* Completion rate */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-bold text-gray-600">Task Completion Rate</span>
            <span className="text-base font-black text-green-600">{rate}%</span>
          </div>
          <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-700"
              style={{ width: `${rate}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>0%</span>
            <span>{completed.length} of {tasks.length} tasks completed</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          ZONE INFORMATION
      ══════════════════════════════════════════════════ */}
      {zone && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2">
            🗺️ Zone Information
          </p>

          {/* Zone banner strip */}
          <div className={`flex items-center gap-4 ${zone.tile} border rounded-2xl px-4 py-4 mb-4`}>
            <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${zone.from} ${zone.to}
              flex items-center justify-center text-2xl shrink-0 shadow-sm`}>
              {zone.emoji}
            </div>
            <div>
              <p className={`font-black text-base ${zone.head}`}>{zone.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{zone.desc}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ZoneTile label="Coordinates" value={zone.coords}   zone={zone} />
            <ZoneTile label="Population"  value={zone.pop}      zone={zone} />
            <ZoneTile label="District"    value={zone.district} zone={zone} />
            <ZoneTile label="Notable"     value={zone.note}     zone={zone} />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          RECENT TASK HISTORY
      ══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <p className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2">
          🕐 Recent Task History
        </p>

        {tasks.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <span className="text-5xl mb-3">📭</span>
            <p className="text-gray-400 text-sm font-medium">No tasks assigned yet.</p>
          </div>
        ) : (
          <div className="space-y-0">
            {[...tasks]
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              .slice(0, 8)
              .map((task, i, arr) => (
                <div
                  key={task._id}
                  className={`flex items-center gap-3 py-3.5 ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}
                >
                  {/* Dot */}
                  <div className={`h-3 w-3 rounded-full shrink-0 ${
                    task.status === 'Completed'   ? 'bg-green-400' :
                    task.status === 'In-Progress' ? 'bg-blue-400'  : 'bg-yellow-400'
                  }`} />

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-800">{task.binId}</span>
                      <span className="text-xs font-mono text-gray-400 hidden sm:inline">{task.taskId}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(task.timestamp).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>

                  {/* Badge */}
                  <StatusBadge status={task.status} />
                </div>
              ))
            }
          </div>
        )}
      </div>

    </div>
  );
}
