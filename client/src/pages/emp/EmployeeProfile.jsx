import { useEffect, useState } from 'react';
import {
  ClipboardList, CheckCircle2, RefreshCw, Flame,
  MapPin, Calendar, User, Shield, ChevronRight,
  TrendingUp, Award,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAllTasks } from '../../services/taskService';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';

// ─────────────────────────────────────────────────────────────────────────────
// Zone config
// ─────────────────────────────────────────────────────────────────────────────
const ZONE = {
  kopargaon: {
    label:   'Kopargaon Zone',
    emoji:   '🏘️',
    desc:    'Ahmednagar district · Godavari River belt',
    coords:  '19.885°N, 74.478°E',
    pop:     '65,273',
    district:'Ahmednagar, Maharashtra',
    note:    'Known for Daityaguru Shukracharya temple and Datta Par site.',
    banner:  'from-slate-700 via-indigo-700 to-indigo-900',
    accent:  'text-indigo-400',
    chipBg:  'bg-indigo-50 text-indigo-700 border-indigo-200',
    tileBg:  'bg-indigo-50/60 border-indigo-100',
    bar:     'from-indigo-400 to-indigo-600',
  },
  shirdi: {
    label:   'Shirdi Zone',
    emoji:   '🛕',
    desc:    'Famous pilgrimage city · Sai Baba Samadhi Mandir',
    coords:  '19.77°N, 74.48°E',
    pop:     '36,004',
    district:'Ahmednagar, Maharashtra',
    note:    "One of India's most visited pilgrimage destinations.",
    banner:  'from-slate-700 via-amber-700 to-orange-800',
    accent:  'text-amber-400',
    chipBg:  'bg-amber-50 text-amber-700 border-amber-200',
    tileBg:  'bg-amber-50/60 border-amber-100',
    bar:     'from-amber-400 to-orange-500',
  },
};

const AV_PALETTE = [
  'from-violet-500 to-violet-700',
  'from-teal-500   to-teal-700',
  'from-rose-500   to-rose-700',
  'from-cyan-500   to-cyan-700',
  'from-amber-500  to-amber-700',
  'from-indigo-500 to-indigo-700',
];
const avatarGrad = (n = '') => AV_PALETTE[n.charCodeAt(0) % AV_PALETTE.length];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Pill badge */
function Pill({ icon: Icon, children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${className}`}>
      {Icon && <Icon size={11} strokeWidth={2.5} />}
      {children}
    </span>
  );
}

/** Individual stat card */
function StatCard({ icon: Icon, value, label, iconColor, valueCls }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 px-3 group hover:bg-slate-50 rounded-2xl transition-colors duration-150">
      <div className={`p-2.5 rounded-xl bg-slate-100 group-hover:bg-white group-hover:shadow-sm transition-all duration-150 ${iconColor}`}>
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <span className={`text-3xl font-black tracking-tight leading-none ${valueCls}`}>{value}</span>
      <span className="text-xs font-medium text-slate-400 text-center">{label}</span>
    </div>
  );
}

/** Zone info tile */
function ZoneTile({ label, value, zone }) {
  return (
    <div className={`${zone.tileBg} border rounded-2xl px-4 py-3.5`}>
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-slate-800 leading-snug">{value}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function EmployeeProfile() {
  const { user } = useAuth();
  const zone     = ZONE[user?.zone] ?? null;

  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [rate,    setRate]    = useState(0);

  useEffect(() => {
    getAllTasks().then(res => {
      const mine = res.data.filter(
        t => String(t.assignedEmployeeId?._id ?? t.assignedEmployeeId) === String(user?._id)
      );
      setTasks(mine);
      const done = mine.filter(t => t.status === 'Completed').length;
      setRate(mine.length ? Math.round((done / mine.length) * 100) : 0);
    }).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <Spinner />;

  const completed = tasks.filter(t => t.status === 'Completed');
  const active    = tasks.filter(t => t.status !== 'Completed');

  // streak
  const dates = [...new Set(completed.map(t =>
    new Date(t.updatedAt ?? t.timestamp).toDateString()
  ))].sort((a, b) => new Date(b) - new Date(a));
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < dates.length; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    if (dates[i] === d.toDateString()) streak++; else break;
  }

  const barColor = zone?.bar ?? 'from-emerald-400 to-emerald-600';

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-10">

      {/* ══════════════════════════════════════════════════
          1 — PROFILE HERO
      ══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden">

        {/* Gradient banner */}
        <div className={`relative h-32 bg-gradient-to-br ${zone?.banner ?? 'from-slate-700 to-slate-900'} overflow-hidden`}>
          {/* Abstract decorative shapes */}
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/5" />
          <div className="absolute top-6 right-20 h-20 w-20 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 left-10 h-24 w-24 rounded-full bg-white/5" />
          {/* Zone badge */}
          {zone && (
            <div className="absolute bottom-3 right-4 flex items-center gap-1.5
              bg-black/25 backdrop-blur-md border border-white/10
              px-3 py-1 rounded-full shadow-lg">
              <span className="text-sm leading-none">{zone.emoji}</span>
              <span className="text-[11px] font-bold text-white tracking-wide">{zone.label}</span>
            </div>
          )}
        </div>

        {/* Avatar + identity */}
        <div className="px-6 pb-6">
          {/* Avatar overlapping banner */}
          <div className="flex items-end justify-between" style={{ marginTop: -38 }}>
            <div className={`h-20 w-20 rounded-2xl bg-gradient-to-br ${avatarGrad(user?.name)}
              ring-4 ring-white shadow-xl flex items-center justify-center
              text-white text-3xl font-black select-none shrink-0`}>
              {user?.name?.[0]?.toUpperCase() ?? 'E'}
            </div>
            {/* Pulsing active badge */}
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200
              px-3 py-1.5 rounded-full shadow-sm mb-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs font-bold text-emerald-700">Active</span>
            </div>
          </div>

          {/* Name + email */}
          <div className="mt-4 mb-4">
            <h2 className="text-xl font-black text-slate-900 leading-tight tracking-tight">
              {user?.name}
            </h2>
            <p className="text-sm text-slate-400 mt-0.5 font-medium">{user?.email}</p>
          </div>

          {/* Metadata pill row */}
          <div className="flex flex-wrap gap-2">
            <Pill icon={User} className="bg-slate-100 text-slate-600 border-slate-200">
              Employee
            </Pill>
            {zone && (
              <Pill icon={MapPin} className={zone.chipBg}>
                {zone.label}
              </Pill>
            )}
            {user?.createdAt && (
              <Pill icon={Calendar} className="bg-violet-50 text-violet-600 border-violet-200">
                Since {new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </Pill>
            )}
            <Pill icon={Shield} className="bg-slate-100 text-slate-500 border-slate-200">
              {user?.role ?? 'employee'}
            </Pill>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          2 — PERFORMANCE METRICS
      ══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp size={16} className="text-slate-400" strokeWidth={2} />
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Performance</h3>
        </div>

        {/* 4 stat cards in a row */}
        <div className="grid grid-cols-4 border border-slate-100 rounded-2xl overflow-hidden divide-x divide-slate-100 bg-white shadow-sm mb-6">
          <StatCard
            icon={ClipboardList} value={tasks.length}     label="Total Tasks"
            iconColor="text-slate-500" valueCls="text-slate-800"
          />
          <StatCard
            icon={CheckCircle2}  value={completed.length} label="Completed"
            iconColor="text-emerald-500" valueCls="text-emerald-600"
          />
          <StatCard
            icon={RefreshCw}     value={active.length}    label="Active"
            iconColor="text-blue-500" valueCls="text-blue-600"
          />
          <StatCard
            icon={Flame}         value={streak}           label="Day Streak"
            iconColor="text-orange-500" valueCls="text-orange-500"
          />
        </div>

        {/* Progress bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award size={15} className="text-slate-400" strokeWidth={2} />
              <span className="text-sm font-bold text-slate-600">Task Completion Rate</span>
            </div>
            <span className="text-base font-black text-emerald-600">{rate}%</span>
          </div>

          {/* Track */}
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-3 rounded-full bg-gradient-to-r ${barColor}
                transition-all duration-1000 ease-out shadow-sm`}
              style={{ width: `${rate}%` }}
            />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">0%</span>
            <span className="text-xs text-slate-400 font-medium">
              {completed.length} of {tasks.length} tasks completed
            </span>
            <span className="text-xs text-slate-400">100%</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          3 — ZONE INFORMATION
      ══════════════════════════════════════════════════ */}
      {zone && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <MapPin size={16} className="text-slate-400" strokeWidth={2} />
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Zone Information</h3>
          </div>

          {/* Zone hero row */}
          <div className={`flex items-center gap-4 ${zone.tileBg} border rounded-2xl px-4 py-4 mb-4`}>
            <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${zone.banner}
              flex items-center justify-center text-2xl shrink-0 shadow-md`}>
              {zone.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-slate-800 text-base leading-tight">{zone.label}</p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{zone.desc}</p>
            </div>
            <ChevronRight size={16} className="text-slate-300 shrink-0" />
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
          4 — RECENT TASK HISTORY
      ══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-5">
          <ClipboardList size={16} className="text-slate-400" strokeWidth={2} />
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Task History</h3>
        </div>

        {tasks.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <ClipboardList size={40} className="text-slate-200 mb-3" />
            <p className="text-slate-400 text-sm font-medium">No tasks assigned yet.</p>
          </div>
        ) : (
          <div>
            {[...tasks]
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              .slice(0, 8)
              .map((task, i, arr) => (
                <div
                  key={task._id}
                  className={`flex items-center gap-4 py-3.5 group hover:bg-slate-50
                    rounded-xl px-2 -mx-2 transition-colors duration-100 cursor-default
                    ${i < arr.length - 1 ? 'border-b border-slate-50' : ''}`}
                >
                  {/* Status dot */}
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                    task.status === 'Completed'   ? 'bg-emerald-400' :
                    task.status === 'In-Progress' ? 'bg-blue-400'    : 'bg-amber-400'
                  }`} />

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">{task.binId}</span>
                      <span className="text-xs font-mono text-slate-300 hidden sm:inline">{task.taskId}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
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
