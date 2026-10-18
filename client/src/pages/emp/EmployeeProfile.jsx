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
    label:    'Kopargaon Zone',
    emoji:    '🏘️',
    desc:     'Ahmednagar district · Godavari River belt',
    coords:   '19.885°N, 74.478°E',
    pop:      '65,273',
    district: 'Ahmednagar, Maharashtra',
    note:     'Known for Daityaguru Shukracharya temple and Datta Par site.',
    // banner uses blue-600 → indigo-600 as specified
    bannerFrom: 'from-blue-600',
    bannerTo:   'to-indigo-600',
    chipBg:   'bg-indigo-50 text-indigo-700 border-indigo-200',
    tileBg:   'bg-indigo-50 border-indigo-100',
    tileHead: 'text-indigo-600',
    bar:      'from-blue-400 to-indigo-500',
  },
  shirdi: {
    label:    'Shirdi Zone',
    emoji:    '🛕',
    desc:     'Famous pilgrimage city · Sai Baba Samadhi Mandir',
    coords:   '19.77°N, 74.48°E',
    pop:      '36,004',
    district: 'Ahmednagar, Maharashtra',
    note:     "One of India's most visited pilgrimage destinations.",
    bannerFrom: 'from-orange-500',
    bannerTo:   'to-amber-600',
    chipBg:   'bg-amber-50 text-amber-700 border-amber-200',
    tileBg:   'bg-amber-50 border-amber-100',
    tileHead: 'text-amber-600',
    bar:      'from-amber-400 to-orange-500',
  },
};

// Avatar background — deterministic per first letter
const AV_COLORS = [
  'bg-amber-500', 'bg-violet-500', 'bg-teal-500',
  'bg-rose-500',  'bg-cyan-600',   'bg-indigo-500',
];
// BUG FIX: use user.name[0] charCode so "R" → correct bucket, not "K"
const avColor = (name = '') => AV_COLORS[name.charCodeAt(0) % AV_COLORS.length];

// ─────────────────────────────────────────────────────────────────────────────
// Small reusable pieces
// ─────────────────────────────────────────────────────────────────────────────
function MetaBadge({ icon: Icon, children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold
      px-3 py-1.5 rounded-full border ${className}`}>
      {Icon && <Icon size={11} strokeWidth={2.5} />}
      {children}
    </span>
  );
}

function StatCard({ icon: Icon, value, label, iconBg, iconColor, valueCls }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 px-2
      group hover:bg-slate-50 rounded-2xl transition-colors duration-150 cursor-default">
      <div className={`p-2.5 rounded-xl ${iconBg}
        group-hover:shadow-sm transition-all duration-150 ${iconColor}`}>
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <span className={`text-3xl font-black tracking-tight leading-none ${valueCls}`}>
        {value}
      </span>
      <span className="text-xs font-medium text-slate-400 text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

function ZoneTile({ label, value, zone }) {
  return (
    <div className={`${zone.tileBg} border rounded-2xl px-4 py-3.5`}>
      <p className={`text-xs font-bold uppercase tracking-widest ${zone.tileHead} opacity-80 mb-1`}>
        {label}
      </p>
      <p className="text-sm font-semibold text-slate-800 leading-snug">{value}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile Hero Card — avatar/banner bug fixed here
// ─────────────────────────────────────────────────────────────────────────────
function ProfileHeroCard({ user, zone }) {
  // BUG FIX: derive initial from user.name, not from zone or any other field
  const initial   = (user?.name ?? '?')[0].toUpperCase();
  const avatarBg  = avColor(user?.name ?? '');

  return (
    /*
     * KEY FIX: The outer card does NOT have overflow-hidden.
     * overflow-hidden is ONLY on the inner banner div.
     * The avatar sits in a wrapper div that overlaps the banner bottom edge
     * using negative margin (-mt-10) + relative + z-10 so it is never clipped.
     */
    <div className="bg-white rounded-2xl shadow-md border border-slate-100">

      {/* ── Banner — overflow-hidden ONLY here ───────────── */}
      <div className={`relative h-32 rounded-t-2xl overflow-hidden
        bg-gradient-to-r ${zone?.bannerFrom ?? 'from-blue-600'} ${zone?.bannerTo ?? 'to-indigo-600'}`}>

        {/* Decorative bubbles */}
        <div className="absolute -top-8 -right-8 h-36 w-36 rounded-full bg-white/10" />
        <div className="absolute top-4  right-20 h-20 w-20 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 left-8  h-24 w-24 rounded-full bg-white/10" />

        {/* Zone tag — top-right inside banner */}
        {zone && (
          <div className="absolute top-3 right-4 flex items-center gap-1.5
            bg-black/25 backdrop-blur-sm border border-white/15
            px-3 py-1 rounded-full">
            <span className="text-sm leading-none">{zone.emoji}</span>
            <span className="text-[11px] font-bold text-white tracking-wide">
              {zone.label}
            </span>
          </div>
        )}
      </div>

      {/* ── Avatar + identity block ───────────────────────── */}
      {/*
       * This div is OUTSIDE the banner overflow-hidden div.
       * -mt-10 pulls it up to overlap the banner bottom edge.
       * relative + z-10 ensures it paints above the banner.
       * NO overflow-hidden on this wrapper or any parent.
       */}
      <div className="relative z-10 -mt-10 px-6 pb-6">

        {/* Avatar row */}
        <div className="flex items-end justify-between mb-4">

          {/* Avatar box */}
          <div
            className={`h-20 w-20 rounded-2xl ${avatarBg}
              border-4 border-white shadow-xl
              flex items-center justify-center
              text-white text-2xl font-bold select-none shrink-0`}
          >
            {initial}
          </div>

          {/* ● Active status badge — right-aligned */}
          <div className="flex items-center gap-2 mb-1
            bg-emerald-50 border border-emerald-200
            px-3 py-1.5 rounded-full shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full
                rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5
                rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-bold text-emerald-700">Active</span>
          </div>
        </div>

        {/* Name + email */}
        <h2 className="text-2xl font-bold text-slate-900 leading-tight tracking-tight">
          {user?.name}
        </h2>
        <p className="text-sm text-slate-500 mt-1 mb-4">{user?.email}</p>

        {/* Metadata badges */}
        <div className="flex flex-wrap gap-2">
          <MetaBadge icon={User}     className="bg-slate-100 text-slate-600 border-slate-200">
            Employee
          </MetaBadge>

          {zone && (
            <MetaBadge icon={MapPin} className={zone.chipBg}>
              {zone.label}
            </MetaBadge>
          )}

          {user?.createdAt && (
            <MetaBadge icon={Calendar} className="bg-violet-50 text-violet-600 border-violet-200">
              Since {new Date(user.createdAt).toLocaleDateString('en-IN', {
                month: 'short', year: 'numeric',
              })}
            </MetaBadge>
          )}

          <MetaBadge icon={Shield} className="bg-slate-100 text-slate-500 border-slate-200">
            {user?.role ?? 'employee'}
          </MetaBadge>
        </div>
      </div>
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
  const dates = [...new Set(completed.map(t =>
    new Date(t.updatedAt ?? t.timestamp).toDateString()
  ))].sort((a, b) => new Date(b) - new Date(a));
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < dates.length; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    if (dates[i] === d.toDateString()) streak++; else break;
  }

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-10">

      {/* 1 — Profile Hero Card (bug fixed) */}
      <ProfileHeroCard user={user} zone={zone} />

      {/* 2 — Performance */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp size={15} className="text-slate-400" strokeWidth={2} />
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
            Performance
          </h3>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-4 rounded-2xl border border-slate-100
          divide-x divide-slate-100 overflow-hidden shadow-sm mb-6">
          <StatCard
            icon={ClipboardList} value={tasks.length}     label="Total Tasks"
            iconBg="bg-slate-100"   iconColor="text-slate-500"  valueCls="text-slate-800"
          />
          <StatCard
            icon={CheckCircle2}  value={completed.length} label="Completed"
            iconBg="bg-emerald-50" iconColor="text-emerald-500" valueCls="text-emerald-600"
          />
          <StatCard
            icon={RefreshCw}     value={active.length}    label="Active"
            iconBg="bg-blue-50"    iconColor="text-blue-500"    valueCls="text-blue-600"
          />
          <StatCard
            icon={Flame}         value={streak}           label="Day Streak"
            iconBg="bg-orange-50"  iconColor="text-orange-500"  valueCls="text-orange-500"
          />
        </div>

        {/* Progress bar */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award size={14} className="text-slate-400" />
              <span className="text-sm font-bold text-slate-600">Task Completion Rate</span>
            </div>
            <span className="text-base font-black text-emerald-600">{rate}%</span>
          </div>

          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-3 rounded-full bg-gradient-to-r ${zone?.bar ?? 'from-emerald-400 to-emerald-600'}
                transition-all duration-1000 ease-out`}
              style={{ width: `${rate}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-slate-400">
            <span>0%</span>
            <span>{completed.length} of {tasks.length} tasks completed</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* 3 — Zone Information */}
      {zone && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <MapPin size={15} className="text-slate-400" strokeWidth={2} />
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
              Zone Information
            </h3>
          </div>

          <div className={`flex items-center gap-4 ${zone.tileBg} border
            rounded-2xl px-4 py-4 mb-4`}>
            <div className={`h-12 w-12 rounded-xl
              bg-gradient-to-br ${zone.bannerFrom} ${zone.bannerTo}
              flex items-center justify-center text-2xl shrink-0 shadow-sm`}>
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

      {/* 4 — Task History */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-5">
          <ClipboardList size={15} className="text-slate-400" strokeWidth={2} />
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
            Task History
          </h3>
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
                  className={`flex items-center gap-4 py-3.5 group
                    hover:bg-slate-50 rounded-xl px-2 -mx-2
                    transition-colors duration-100 cursor-default
                    ${i < arr.length - 1 ? 'border-b border-slate-50' : ''}`}
                >
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                    task.status === 'Completed'   ? 'bg-emerald-400' :
                    task.status === 'In-Progress' ? 'bg-blue-400'    : 'bg-amber-400'
                  }`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">{task.binId}</span>
                      <span className="text-xs font-mono text-slate-300 hidden sm:inline">
                        {task.taskId}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(task.timestamp).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>

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
