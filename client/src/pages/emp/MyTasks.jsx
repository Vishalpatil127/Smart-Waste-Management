import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAllTasks, updateTaskStatus } from '../../services/taskService';
import { getAllBins } from '../../services/binService';
import Spinner from '../../components/Spinner';

// ── Priority helpers ──────────────────────────────────────────────────────────
const getPriority = (fill) =>
  fill > 80 ? 'High' : fill > 50 ? 'Medium' : 'Low';

const PRIORITY_STYLE = {
  High:   { bg: 'bg-red-100',    text: 'text-red-600',    dot: 'bg-red-500',    icon: 'bg-red-500'    },
  Medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-400', icon: 'bg-yellow-500' },
  Low:    { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500',  icon: 'bg-green-500'  },
};

const STATUS_FLOW = { 'Pending': 'In-Progress', 'In-Progress': 'Completed' };

const TABS = [
  { key: 'active',    label: 'Today',     icon: '📋' },
  { key: 'completed', label: 'Completed', icon: '✅' },
];

// ── Bin task row (matches image style) ───────────────────────────────────────
function TaskRow({ task, bin, onNavigate, onAction, updating }) {
  const fill     = bin?.fillPercentage ?? 0;
  const priority = getPriority(fill);
  const style    = PRIORITY_STYLE[priority];
  const next     = STATUS_FLOW[task.status];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex items-center gap-4 hover:shadow-md transition-shadow">
      {/* Bin icon circle */}
      <div className={`${style.icon} h-11 w-11 rounded-full flex items-center justify-center shrink-0`}>
        <span className="text-white text-lg">🗑️</span>
      </div>

      {/* Info block */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-gray-900 text-sm">{task.binId}</p>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
            {priority}
          </span>
          {task.status === 'In-Progress' && (
            <span className="text-xs bg-blue-100 text-blue-600 font-bold px-2 py-0.5 rounded-full animate-pulse">
              Active
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          Fill Level: <span className={`font-bold ${style.text}`}>{fill}%</span>
          {bin && ` · ${bin.location.lat.toFixed(4)}, ${bin.location.lng.toFixed(4)}`}
        </p>
        <p className="text-xs text-gray-400 mt-0.5 font-mono">{task.taskId}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1.5 shrink-0">
        <button
          onClick={() => onNavigate(task, bin)}
          className="flex items-center gap-1 bg-gray-900 hover:bg-gray-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
        >
          📍 Navigate
        </button>
        {next && (
          <button
            onClick={() => onAction(task)}
            disabled={updating === task.taskId}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl text-white transition-colors disabled:opacity-50 ${
              task.status === 'Pending' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {updating === task.taskId ? '…' : task.status === 'Pending' ? '▶ Start' : '✓ Done'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Completed row ─────────────────────────────────────────────────────────────
function CompletedRow({ task }) {
  return (
    <div className="bg-white rounded-2xl border border-green-100 px-4 py-3 flex items-center gap-3">
      <div className="h-9 w-9 rounded-full bg-green-500 flex items-center justify-center shrink-0">
        <span className="text-white text-sm">✓</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-800 text-sm">{task.binId}</p>
        <p className="text-xs text-gray-400">{new Date(task.timestamp).toLocaleDateString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</p>
      </div>
      <span className="text-xs bg-green-100 text-green-700 font-bold px-2.5 py-1 rounded-full shrink-0">
        Collected
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MyTasks() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [myTasks,  setMyTasks]  = useState([]);
  const [bins,     setBins]     = useState([]);
  const [tab,      setTab]      = useState('active');
  const [loading,  setLoading]  = useState(true);
  const [updating, setUpdating] = useState('');
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [taskRes, binRes] = await Promise.all([getAllTasks(), getAllBins()]);
      const mine = taskRes.data.filter(
        t => String(t.assignedEmployeeId?._id ?? t.assignedEmployeeId) === String(user?._id)
      );
      setMyTasks(mine);
      setBins(binRes.data);
    } catch { setError('Failed to load tasks.'); }
    finally  { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(t);
  }, [success]);

  const handleAction = async (task) => {
    const next = STATUS_FLOW[task.status];
    if (!next) return;
    setUpdating(task.taskId);
    try {
      await updateTaskStatus(task.taskId, next);
      if (next === 'Completed') {
        const bin = bins.find(b => b.binId === task.binId);
        navigate('/emp/collection-complete', { state: { task, bin, user } });
      } else {
        setSuccess(`Task ${task.taskId} started!`);
        load();
      }
    } catch { setError('Failed to update task.'); }
    finally  { setUpdating(''); }
  };

  const handleNavigate = (task, bin) => {
    navigate('/emp/navigate', { state: { task, bin } });
  };

  const active    = myTasks.filter(t => t.status !== 'Completed')
    .sort((a, b) => {
      const binA = bins.find(x => x.binId === a.binId);
      const binB = bins.find(x => x.binId === b.binId);
      return (binB?.fillPercentage ?? 0) - (binA?.fillPercentage ?? 0);
    });
  const completed = myTasks.filter(t => t.status === 'Completed')
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">

      {/* Alerts */}
      {error   && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">⚠️ {error}</div>}
      {success && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">{success}</div>}

      {/* Tab bar — matches image */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl w-fit">
        {TABS.map(t => (
          <button key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
              tab === t.key
                ? 'bg-green-700 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon} {t.label}
            <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full font-bold ${
              tab === t.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {t.key === 'active' ? active.length : completed.length}
            </span>
          </button>
        ))}
      </div>

      {/* Active tasks */}
      {tab === 'active' && (
        <>
          {active.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center py-16 text-center shadow-sm">
              <span className="text-5xl mb-3">🎉</span>
              <p className="text-gray-600 font-bold">All tasks completed!</p>
              <p className="text-xs text-gray-400 mt-1">No pending tasks assigned to you.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {active.map(task => (
                <TaskRow
                  key={task._id}
                  task={task}
                  bin={bins.find(b => b.binId === task.binId)}
                  onNavigate={handleNavigate}
                  onAction={handleAction}
                  updating={updating}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Completed tasks */}
      {tab === 'completed' && (
        <>
          {completed.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center py-16 text-center shadow-sm">
              <span className="text-5xl mb-3">📭</span>
              <p className="text-gray-600 font-bold">No completed tasks yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {completed.map(task => (
                <CompletedRow key={task._id} task={task} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
