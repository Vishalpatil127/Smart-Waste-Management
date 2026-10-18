import { useEffect, useState, useCallback } from 'react';
import { useLiveBins }        from '../hooks/useLiveBins';
import { getCriticalBins }    from '../services/binService';
import SummaryCards           from '../components/SummaryCards';
import CriticalAlertsTable    from '../components/CriticalAlertsTable';
import AssignTaskModal        from '../components/AssignTaskModal';

// Live indicator
function LiveDot() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      Firebase Live
    </span>
  );
}

export default function CommandCenter() {
  // ── Live all-bins from Firebase ───────────────────────────────────────────
  const { bins: allBins, loading: loadingAll } = useLiveBins();

  const [criticalBins, setCriticalBins] = useState([]);
  const [loadingCrit,  setLoadingCrit]  = useState(true);
  const [error,        setError]        = useState('');
  const [lastRefresh,  setLastRefresh]  = useState(null);
  const [selectedBin,  setSelectedBin]  = useState(null);
  const [successMsg,   setSuccessMsg]   = useState('');

  // Critical bins still come from REST (includes openTasks population)
  const fetchCritical = useCallback(async () => {
    setLoadingCrit(true);
    try {
      const res = await getCriticalBins();
      setCriticalBins(res.data);
      setLastRefresh(new Date());
    } catch {
      setError('Failed to load critical bins.');
    } finally {
      setLoadingCrit(false);
    }
  }, []);

  // Initial + auto-refresh critical every 30s
  useEffect(() => {
    fetchCritical();
    const id = setInterval(fetchCritical, 30_000);
    return () => clearInterval(id);
  }, [fetchCritical]);

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(''), 4000);
    return () => clearTimeout(t);
  }, [successMsg]);

  const handleDispatchSuccess = (msg) => {
    setSuccessMsg(msg);
    fetchCritical();
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Command Center</h2>
          <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-3">
            Bin overview updates in real-time
            <LiveDot />
            {lastRefresh && (
              <span className="text-gray-300">
                · Alerts refreshed {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchCritical}
          disabled={loadingCrit}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <span className={loadingCrit ? 'animate-spin' : ''}>🔄</span>
          Refresh Alerts
        </button>
      </div>

      {/* Errors / Success */}
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
          ⚠️ {error}
        </div>
      )}
      {successMsg && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
          ✅ {successMsg}
        </div>
      )}

      {/* Summary cards — live bins from Firebase */}
      <SummaryCards bins={allBins} loading={loadingAll} />

      {/* Critical alerts table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-700 flex items-center gap-2">
            🔴 Critical Alerts
            {criticalBins.length > 0 && !loadingCrit && (
              <span className="badge-critical">{criticalBins.length}</span>
            )}
          </h3>
          <p className="text-xs text-gray-400">Bins with fill ≥ 80% requiring immediate collection</p>
        </div>
        <CriticalAlertsTable
          bins={criticalBins}
          onAssign={(bin) => { setSuccessMsg(''); setSelectedBin(bin); }}
          loading={loadingCrit}
        />
      </div>

      {/* Assign Task Modal */}
      <AssignTaskModal
        bin={selectedBin}
        onClose={() => setSelectedBin(null)}
        onSuccess={handleDispatchSuccess}
      />
    </div>
  );
}
