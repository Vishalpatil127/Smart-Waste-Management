import { useState } from 'react';
import { useLiveBins } from '../hooks/useLiveBins';
import AssignTaskModal from '../components/AssignTaskModal';
import StatusBadge from '../components/StatusBadge';
import FillBar from '../components/FillBar';
import Spinner from '../components/Spinner';
import { useAuth } from '../context/AuthContext';

export default function Alerts() {
  const { user } = useAuth();

  // Live-merged bins (MongoDB + Firestore + RTDB) — same source as Dashboard
  const { bins: allBins, loading, error: liveError } = useLiveBins();

  const [assignBin, setAssignBin] = useState(null); // opens AssignTaskModal
  const [success,   setSuccess]   = useState('');

  // Only Critical bins
  const bins = allBins.filter(b => b.status === 'Critical');

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-700">
          Critical Bins
          {bins.length > 0 && (
            <span className="ml-2 badge-critical">{bins.length}</span>
          )}
        </h2>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          Live
        </span>
      </div>

      {liveError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {liveError}
        </div>
      )}
      {success && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          ✅ {success}
        </div>
      )}

      {/* No critical bins */}
      {bins.length === 0 ? (
        <div className="card text-center py-12">
          <span className="text-4xl">✅</span>
          <p className="mt-2 text-gray-500">No critical bins right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {bins.map((bin) => (
            <div key={bin._id ?? bin.binId} className="card border-l-4 border-red-500 space-y-4">

              {/* Bin header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800 font-mono">{bin.binId}</p>
                  {bin.location?.lat != null ? (
                    <p className="text-xs text-gray-400 mt-0.5">
                      📍 {bin.location.lat.toFixed(4)}, {bin.location.lng.toFixed(4)}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-0.5">📍 No location</p>
                  )}
                </div>
                <StatusBadge status={bin.status} />
              </div>

              <FillBar percentage={bin.fillPercentage} />

              {/* Sensor chips (RTDB bins) */}
              {bin._sensor && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Fill Level', value: `${bin.fillPercentage}%`,
                      color: 'text-red-600',  bg: 'bg-red-50'  },
                    { label: 'Distance',
                      value: bin._sensor.distanceCm != null ? `${bin._sensor.distanceCm} cm` : '—',
                      color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Bin Height',
                      value: bin._sensor.binHeightCm != null ? `${bin._sensor.binHeightCm} cm` : '—',
                      color: 'text-gray-700', bg: 'bg-gray-50' },
                  ].map(f => (
                    <div key={f.label} className={`${f.bg} rounded-xl px-3 py-2 text-center border border-gray-100`}>
                      <p className={`text-sm font-extrabold ${f.color}`}>{f.value}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{f.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Action */}
              <div>
                {bin.openTasks?.length > 0 ? (
                  <p className="text-xs text-blue-600 font-medium">
                    ✅ {bin.openTasks.length} open task(s) already assigned
                  </p>
                ) : (
                  user?.role === 'admin' && (
                    <button
                      onClick={() => { setSuccess(''); setAssignBin(bin); }}
                      className="btn-danger text-sm w-full"
                    >
                      🚛 Dispatch Task
                    </button>
                  )
                )}
              </div>

              <p className="text-xs text-gray-400">
                Last updated:{' '}
                {bin.lastUpdated ? new Date(bin.lastUpdated).toLocaleString() : '—'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Zone-aware assign modal */}
      <AssignTaskModal
        bin={assignBin}
        onClose={() => setAssignBin(null)}
        onSuccess={(msg) => { setSuccess(msg); setAssignBin(null); }}
      />
    </div>
  );
}
