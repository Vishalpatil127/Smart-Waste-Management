import { useEffect, useState, useCallback } from 'react';
import { getAllUsers } from '../services/userService';
import { getAllBins } from '../services/binService';
import { getAllTasks, createTask, assignTask, updateTaskStatus } from '../services/taskService';
import StatusBadge from '../components/StatusBadge';
import FillBar from '../components/FillBar';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';

// ── Employee Avatar ───────────────────────────────────────────────────────────
function Avatar({ name, size = 'md' }) {
  const dim = size === 'lg' ? 'h-12 w-12 text-lg' : 'h-9 w-9 text-sm';
  const colors = [
    'bg-blue-500', 'bg-purple-500', 'bg-green-500',
    'bg-orange-500', 'bg-pink-500', 'bg-teal-500',
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`${dim} ${color} rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
      {name[0].toUpperCase()}
    </div>
  );
}

// ── Assign Bin Modal ──────────────────────────────────────────────────────────
function AssignBinModal({ employee, bins, onClose, onSuccess }) {
  const [selectedBin, setSelectedBin] = useState('');
  const [filter, setFilter]           = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');

  const filtered = bins.filter(b =>
    filter === '' || b.status === filter
  );

  const handleAssign = async () => {
    if (!selectedBin) { setError('Please select a bin.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const bin = bins.find(b => b._id === selectedBin);
      const taskRes = await createTask({ binId: bin.binId });
      await assignTask(taskRes.data.taskId, employee._id);
      onSuccess(`Bin ${bin.binId} assigned to ${employee.name}.`);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Assignment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={!!employee} onClose={onClose} title={`Assign Bin to ${employee?.name}`}>
      {/* Employee summary */}
      <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-5">
        {employee && <Avatar name={employee.name} size="lg" />}
        <div>
          <p className="font-semibold text-gray-800">{employee?.name}</p>
          <p className="text-xs text-gray-400">{employee?.email}</p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {['', 'Critical', 'Warning', 'Normal'].map(s => (
          <button
            key={s || 'all'}
            onClick={() => { setFilter(s); setSelectedBin(''); }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
              filter === s
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            {s || 'All'} ({s === '' ? bins.length : bins.filter(b => b.status === s).length})
          </button>
        ))}
      </div>

      {/* Bin list */}
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1 mb-4">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No bins match this filter.</p>
        ) : filtered.map(bin => (
          <label
            key={bin._id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
              selectedBin === bin._id
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name="bin-select"
              value={bin._id}
              checked={selectedBin === bin._id}
              onChange={() => { setSelectedBin(bin._id); setError(''); }}
              className="mt-1 accent-green-600"
            />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-sm text-gray-800">{bin.binId}</span>
                <StatusBadge status={bin.status} />
              </div>
              <FillBar percentage={bin.fillPercentage} />
              <p className="text-xs text-gray-400">
                📍 {bin.location.lat.toFixed(5)}, {bin.location.lng.toFixed(5)}
              </p>
            </div>
          </label>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="btn-secondary" disabled={submitting}>Cancel</button>
        <button
          onClick={handleAssign}
          disabled={submitting || !selectedBin}
          className="btn-primary"
        >
          {submitting ? 'Assigning…' : '✅ Assign Bin'}
        </button>
      </div>
    </Modal>
  );
}

// ── Employee Card ─────────────────────────────────────────────────────────────
function EmployeeCard({ employee, tasks, onAssignBin, onCompleteTask }) {
  const myTasks = tasks.filter(
    t => String(t.assignedEmployeeId?._id ?? t.assignedEmployeeId) === String(employee._id)
  );
  const active    = myTasks.filter(t => t.status !== 'Completed');
  const completed = myTasks.filter(t => t.status === 'Completed');

  return (
    <div className="card space-y-4">
      {/* Employee header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={employee.name} size="lg" />
          <div>
            <p className="font-bold text-gray-800">{employee.name}</p>
            <p className="text-xs text-gray-400">{employee.email}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
            employee.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
          }`}>
            {employee.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Total',     value: myTasks.length,    color: 'text-gray-700' },
          { label: 'Active',    value: active.length,     color: 'text-blue-600' },
          { label: 'Completed', value: completed.length,  color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-xl py-2">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Active assignments */}
      {active.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Active Assignments
          </p>
          <div className="space-y-2">
            {active.map(task => (
              <div
                key={task._id}
                className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800 font-mono">{task.binId}</p>
                  <p className="text-xs text-gray-400">{task.taskId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={task.status} />
                  <button
                    onClick={() => onCompleteTask(task)}
                    className="text-xs text-green-600 hover:text-green-800 font-semibold transition-colors"
                    title="Mark as completed"
                  >
                    ✓ Done
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {active.length === 0 && (
        <p className="text-xs text-gray-400 italic text-center py-1">No active assignments</p>
      )}

      {/* Assign button */}
      <button
        onClick={() => onAssignBin(employee)}
        className="btn-primary w-full text-sm"
      >
        + Assign Bin
      </button>
    </div>
  );
}

// ── Employees Page ────────────────────────────────────────────────────────────
export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [bins, setBins]           = useState([]);
  const [tasks, setTasks]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal states
  const [assignTarget, setAssignTarget] = useState(null); // employee to assign bin to

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, binRes, taskRes] = await Promise.all([
        getAllUsers('employee'),
        getAllBins(),
        getAllTasks(),
      ]);
      setEmployees(empRes.data);
      setBins(binRes.data);
      setTasks(taskRes.data);
    } catch {
      setError('Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-dismiss success
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(''), 4000);
    return () => clearTimeout(t);
  }, [successMsg]);

  const handleCompleteTask = async (task) => {
    try {
      await updateTaskStatus(task.taskId, 'Completed');
      setSuccessMsg(`Task ${task.taskId} marked as completed.`);
      load();
    } catch {
      setError('Failed to update task.');
    }
  };

  const handleAssignSuccess = (msg) => {
    setSuccessMsg(msg);
    load();
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Employees</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Manage team assignments — assign bins and track progress
          </p>
        </div>
        <button onClick={load} className="btn-secondary text-sm">🔄 Refresh</button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          ⚠️ {error}
        </div>
      )}
      {successMsg && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          ✅ {successMsg}
        </div>
      )}

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Employees', value: employees.length,                                    color: 'text-gray-700',   bg: 'bg-gray-50',   icon: '👥' },
          { label: 'Active',          value: employees.filter(e => e.isActive).length,            color: 'text-green-600',  bg: 'bg-green-50',  icon: '🟢' },
          { label: 'Assigned Tasks',  value: tasks.filter(t => t.assignedEmployeeId && t.status !== 'Completed').length, color: 'text-blue-600', bg: 'bg-blue-50', icon: '📋' },
          { label: 'Completed Today', value: tasks.filter(t => {
              const today = new Date();
              const d     = new Date(t.updatedAt ?? t.timestamp);
              return t.status === 'Completed' &&
                d.getDate()     === today.getDate() &&
                d.getMonth()    === today.getMonth() &&
                d.getFullYear() === today.getFullYear();
            }).length,                                                                             color: 'text-purple-600', bg: 'bg-purple-50', icon: '✅' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3`}>
            <span className="text-xl">{s.icon}</span>
            <div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Employee grid */}
      {employees.length === 0 ? (
        <div className="card text-center py-16">
          <span className="text-5xl">👥</span>
          <p className="mt-3 text-gray-500 font-medium">No employees found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {employees.map(emp => (
            <EmployeeCard
              key={emp._id}
              employee={emp}
              tasks={tasks}
              onAssignBin={setAssignTarget}
              onCompleteTask={handleCompleteTask}
            />
          ))}
        </div>
      )}

      {/* Quick assignment table */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-700 mb-4">All Active Assignments</h3>
        {tasks.filter(t => t.status !== 'Completed' && t.assignedEmployeeId).length === 0 ? (
          <p className="text-sm text-gray-400">No active assignments right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="pb-3 pr-4">Employee</th>
                  <th className="pb-3 pr-4">Bin ID</th>
                  <th className="pb-3 pr-4">Fill Level</th>
                  <th className="pb-3 pr-4">Task Status</th>
                  <th className="pb-3">Assigned At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tasks
                  .filter(t => t.status !== 'Completed' && t.assignedEmployeeId)
                  .map(task => {
                    const bin = bins.find(b => b.binId === task.binId);
                    const emp = task.assignedEmployeeId;
                    return (
                      <tr key={task._id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            {emp?.name && <Avatar name={emp.name} size="sm" />}
                            <div>
                              <p className="font-medium text-gray-800 text-xs">{emp?.name ?? 'Unknown'}</p>
                              <p className="text-xs text-gray-400">{emp?.email ?? '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 font-mono font-bold text-gray-800">{task.binId}</td>
                        <td className="py-3 pr-4 w-36">
                          {bin ? <FillBar percentage={bin.fillPercentage} /> : '—'}
                        </td>
                        <td className="py-3 pr-4">
                          <StatusBadge status={task.status} />
                        </td>
                        <td className="py-3 text-xs text-gray-400">
                          {new Date(task.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Bin Modal */}
      {assignTarget && (
        <AssignBinModal
          employee={assignTarget}
          bins={bins}
          onClose={() => setAssignTarget(null)}
          onSuccess={handleAssignSuccess}
        />
      )}
    </div>
  );
}
