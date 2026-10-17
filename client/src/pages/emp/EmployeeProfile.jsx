import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAllTasks } from '../../services/taskService';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';

const ZONE_INFO = {
  kopargaon: {
    label:  'Kopargaon Zone',
    emoji:  '🏘️',
    desc:   'Ahmednagar district — Godavari River belt',
    coords: '19.885°N, 74.478°E',
    pop:    '65,273',
    note:   'Known for Daityaguru Shukracharya temple and Datta Par site.',
    gradient: 'from-blue-600 to-blue-800',
    badge:  'bg-blue-100 text-blue-700',
  },
  shirdi: {
    label:  'Shirdi Zone',
    emoji:  '🛕',
    desc:   'Famous pilgrimage city — Sai Baba Samadhi Mandir',
    coords: '19.77°N, 74.48°E',
    pop:    '36,004',
    note:   'One of India\'s most visited pilgrimage destinations.',
    gradient: 'from-orange-500 to-orange-700',
    badge:  'bg-orange-100 text-orange-700',
  },
};

const AVATAR_COLORS = ['bg-indigo-500','bg-teal-500','bg-violet-500','bg-rose-500','bg-cyan-500','bg-amber-500'];
const avatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

export default function EmployeeProfile() {
  const { user }  = useAuth();
  const zone      = ZONE_INFO[user?.zone];

  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllTasks()
      .then(res => {
        const mine = res.data.filter(
          t => String(t.assignedEmployeeId?._id ?? t.assignedEmployeeId) === String(user?._id)
        );
        setTasks(mine);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <Spinner />;

  const active    = tasks.filter(t => t.status !== 'Completed');
  const completed = tasks.filter(t => t.status === 'Completed');

  // Completion rate
  const rate = tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0;

  // Streak — consecutive days with at least one completed task
  const completedDates = [...new Set(
    completed.map(t => new Date(t.updatedAt ?? t.timestamp).toDateString())
  )].sort((a,b) => new Date(b) - new Date(a));

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < completedDates.length; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (completedDates[i] === d.toDateString()) streak++;
    else break;
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Profile card ────────────────────────────────── */}
      <div className="card overflow-hidden p-0">
        {/* Banner */}
        <div className={`bg-gradient-to-r ${zone?.gradient ?? 'from-gray-700 to-gray-900'} h-24`} />

        {/* Avatar + name */}
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-10 mb-4">
            <div className={`h-20 w-20 rounded-2xl ${avatarColor(user?.name)} flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg shrink-0`}>
              {user?.name?.[0]?.toUpperCase() ?? 'E'}
            </div>
            <div className="pb-1">
              <h2 className="text-xl font-bold text-gray-800">{user?.name}</h2>
              <p className="text-sm text-gray-400">{user?.email}</p>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: 'Role',   value: 'Employee', icon: '👷' },
              { label: 'Status', value: user?.isActive ? 'Active' : 'Inactive', icon: user?.isActive ? '🟢' : '🔴' },
              { label: 'Zone',   value: zone?.label ?? 'Unassigned', icon: zone?.emoji ?? '📍' },
              { label: 'Member since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month:'short', year:'numeric' }) : '—', icon: '📅' },
            ].map(f => (
              <div key={f.label} className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-xl">{f.icon}</span>
                <div>
                  <p className="text-xs text-gray-400">{f.label}</p>
                  <p className="font-semibold text-gray-800">{f.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Performance stats ────────────────────────────── */}
      <div className="card space-y-4">
        <h3 className="font-bold text-gray-800">Performance</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Tasks',  value: tasks.length,    icon: '📋', color: 'text-gray-700'   },
            { label: 'Completed',    value: completed.length,icon: '✅', color: 'text-green-600'  },
            { label: 'Active',       value: active.length,   icon: '🔄', color: 'text-blue-600'   },
            { label: 'Day Streak',   value: `${streak}🔥`,   icon: '🏆', color: 'text-orange-600' },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl px-4 py-3 text-center">
              <p className="text-xl mb-1">{s.icon}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Completion rate bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span className="font-semibold">Task Completion Rate</span>
            <span className="font-bold text-green-600">{rate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all duration-700"
              style={{ width: `${rate}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Zone info card ───────────────────────────────── */}
      {zone && (
        <div className="card space-y-4">
          <h3 className="font-bold text-gray-800">Zone Information</h3>
          <div className={`${zone.badge.replace('text-','').replace('-700','').replace('-100','')} rounded-2xl border px-5 py-4 space-y-3`}
               style={{ background: '' }}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{zone.emoji}</span>
              <div>
                <p className="font-bold text-gray-800 text-base">{zone.label}</p>
                <p className="text-xs text-gray-500">{zone.desc}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: 'Coordinates', value: zone.coords },
                { label: 'Population',  value: zone.pop    },
                { label: 'District',    value: 'Ahmednagar, Maharashtra' },
                { label: 'Notable',     value: zone.note   },
              ].map(f => (
                <div key={f.label} className="bg-white/60 rounded-xl px-3 py-2 border border-gray-100">
                  <p className="text-gray-400 mb-0.5">{f.label}</p>
                  <p className="font-semibold text-gray-700 leading-snug">{f.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Recent task history ──────────────────────────── */}
      <div className="card space-y-3">
        <h3 className="font-bold text-gray-800">Recent Task History</h3>
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No tasks yet.</p>
        ) : (
          <div className="space-y-2">
            {[...tasks]
              .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))
              .slice(0, 8)
              .map(task => (
                <div key={task._id}
                  className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-gray-500">{task.taskId}</span>
                      <span className="font-semibold text-sm text-gray-800">{task.binId}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(task.timestamp).toLocaleString('en-IN')}
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
