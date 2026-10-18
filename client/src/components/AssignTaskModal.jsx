import { useEffect, useState } from 'react';
import Modal from './Modal';
import Spinner from './Spinner';
import FillBar from './FillBar';
import { getEmployeeAvailability, getAllUsers } from '../services/userService';
import { createTask, assignTask } from '../services/taskService';

/**
 * Derive zone from binId prefix:
 *   KOP-* → kopargaon
 *   SHR-* → shirdi
 *   anything else → null (load all employees)
 */
function zoneFromBinId(binId = '') {
  const id = binId.toUpperCase();
  if (id.startsWith('KOP')) return 'kopargaon';
  if (id.startsWith('SHR')) return 'shirdi';
  return null;
}

function ZoneTag({ zone }) {
  if (!zone) return null;
  const label = zone === 'kopargaon' ? '📍 Kopargaon' : '📍 Shirdi';
  const cls   = zone === 'kopargaon'
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-purple-50 text-purple-700 border-purple-200';
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

/**
 * AssignTaskModal
 * Props:
 *   bin        – the critical bin object (or null to close)
 *   onClose    – close handler
 *   onSuccess  – called with message string after successful dispatch
 */
export default function AssignTaskModal({ bin, onClose, onSuccess }) {
  const [employees,   setEmployees]   = useState([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [loadingEmps, setLoadingEmps] = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');
  const [zone,        setZone]        = useState(null);

  // Fetch zone-matched employees every time the modal opens for a new bin
  useEffect(() => {
    if (!bin) return;
    setSelectedEmp('');
    setError('');
    setLoadingEmps(true);

    const detectedZone = zoneFromBinId(bin.binId);
    setZone(detectedZone);

    const fetcher = detectedZone
      ? getEmployeeAvailability(detectedZone)   // includes isBusy + activeTasks
      : getAllUsers('employee');                  // fallback: all employees

    fetcher
      .then((res) => setEmployees(res.data))
      .catch(() => setError('Could not load employees. Please try again.'))
      .finally(() => setLoadingEmps(false));
  }, [bin]);

  const handleDispatch = async () => {
    if (!selectedEmp) {
      setError('Please select an employee before dispatching.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      // Pass sensor data so server can auto-register RTDB-only bins (e.g. BIN001)
      const taskPayload = {
        binId:          bin.binId,
        fillPercentage: bin.fillPercentage,
        ...(bin.location?.lat != null && {
          lat: bin.location.lat,
          lng: bin.location.lng,
        }),
      };
      const taskRes = await createTask(taskPayload);
      await assignTask(taskRes.data.taskId, selectedEmp);
      const emp = employees.find((e) => e._id === selectedEmp);
      onSuccess?.(`Task dispatched to ${emp?.name ?? 'employee'}.`);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Dispatch failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!bin) return null;

  // Sort: available first, busy last
  const sorted = [...employees].sort((a, b) => {
    if (a.isBusy === b.isBusy) return a.name.localeCompare(b.name);
    return a.isBusy ? 1 : -1;
  });

  const availableCount = employees.filter(e => !e.isBusy).length;

  return (
    <Modal isOpen={!!bin} onClose={onClose} title="Dispatch Collection Task">

      {/* Bin summary */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800 font-mono">{bin.binId}</span>
            <span className="badge-critical">Critical</span>
            <ZoneTag zone={zone} />
          </div>
          <span className="text-xs font-bold text-red-600">{bin.fillPercentage}% Full</span>
        </div>
        {bin.location?.lat != null ? (
          <p className="text-xs text-gray-500 mb-3">
            📍 {bin.location.lat.toFixed(5)}, {bin.location.lng.toFixed(5)}
          </p>
        ) : (
          <p className="text-xs text-gray-400 mb-3">📍 No location data</p>
        )}
        <FillBar percentage={bin.fillPercentage} />
      </div>

      {/* Employee selector */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">
            {zone
              ? `Employees — ${zone.charAt(0).toUpperCase() + zone.slice(1)} Region`
              : 'All Employees'}
          </label>
          {!loadingEmps && employees.length > 0 && (
            <span className="text-xs text-gray-400">
              <span className="text-green-600 font-semibold">{availableCount}</span> available
              {' · '}
              <span className="text-amber-600 font-semibold">{employees.length - availableCount}</span> busy
            </span>
          )}
        </div>

        {loadingEmps ? (
          <div className="flex justify-center py-6"><Spinner size="sm" /></div>
        ) : employees.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-400 italic">No employees found for this region.</p>
            {zone && (
              <p className="text-xs text-gray-400 mt-1">
                Add employees with zone = "{zone}" to assign tasks.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {sorted.map((emp) => {
              const isSelected = selectedEmp === emp._id;
              const isAvailable = !emp.isBusy;

              return (
                <label
                  key={emp._id}
                  className={`flex items-start gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 shadow-sm'
                      : isAvailable
                        ? 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                        : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50 opacity-80'
                  }`}
                >
                  <input
                    type="radio"
                    name="employee"
                    value={emp._id}
                    checked={isSelected}
                    onChange={() => { setSelectedEmp(emp._id); setError(''); }}
                    className="accent-primary-600 mt-1 shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    {/* Top row: avatar + name + status badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        isAvailable ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {emp.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{emp.name}</p>
                        <p className="text-xs text-gray-400 truncate">{emp.email}</p>
                      </div>
                      <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                        isAvailable
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {isAvailable ? '✓ Available' : '⏳ Busy'}
                      </span>
                    </div>

                    {/* Active tasks for busy employees */}
                    {emp.activeTasks?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-gray-500 font-medium">Current tasks:</p>
                        {emp.activeTasks.map((t) => (
                          <div key={t.taskId ?? t._id}
                            className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1">
                            <span className="font-mono text-xs text-amber-800 font-semibold">{t.taskId}</span>
                            <span className="text-xs text-gray-500">→ Bin</span>
                            <span className="font-mono text-xs text-gray-700">{t.binId}</span>
                            <span className={`ml-auto text-xs px-1.5 py-0.5 rounded font-medium ${
                              t.status === 'In-Progress'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {t.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {!emp.isActive && (
                      <p className="text-xs text-gray-400 italic mt-1">Account inactive</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="btn-secondary" disabled={submitting}>
          Cancel
        </button>
        <button
          onClick={handleDispatch}
          disabled={submitting || !selectedEmp || loadingEmps}
          className="btn-primary"
        >
          {submitting ? 'Dispatching…' : '🚛 Dispatch'}
        </button>
      </div>
    </Modal>
  );
}
