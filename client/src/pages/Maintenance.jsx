import { useEffect, useState, useCallback } from 'react';
import { getAllBins, updateBin } from '../services/binService';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import FillBar from '../components/FillBar';
import Modal from '../components/Modal';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Derive maintenance flags from a bin.
 * Since our bins don't have real sensor hardware flags we simulate them:
 *   - needsAttention : fill >= 80% AND status === 'Critical'
 *   - lowBattery     : binId ends in an odd digit  (simulated)
 *   - sensorOffline  : lastUpdated > 2 hours ago
 */
function getFlags(bin) {
  const ageMs       = Date.now() - new Date(bin.lastUpdated).getTime();
  const needsAttn   = bin.status === 'Critical';
  const lowBattery  = parseInt(bin.binId.slice(-1), 10) % 2 !== 0;   // simulated
  const offline     = ageMs > 2 * 60 * 60 * 1000;                    // > 2 h
  return { needsAttn, lowBattery, offline };
}

// ── Stat card (matches image: icon + label + big number) ─────────────────────
function DiagCard({ icon, iconBg, label, value, active }) {
  return (
    <div className={`bg-white rounded-2xl border ${active ? 'border-red-200 shadow-sm' : 'border-gray-100'} px-6 py-5 flex items-center gap-5`}>
      <div className={`${iconBg} h-11 w-11 rounded-xl flex items-center justify-center text-xl shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className={`text-3xl font-extrabold ${active && value > 0 ? 'text-red-500' : 'text-gray-800'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Mark-repaired modal ───────────────────────────────────────────────────────
function RepairModal({ bin, onClose, onSuccess }) {
  const [note,       setNote]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Reset fill to 0 to simulate repaired + emptied bin
      await updateBin({
        binId:          bin.binId,
        fillPercentage: 0,
        lat:            bin.location.lat,
        lng:            bin.location.lng,
      });
      onSuccess(`${bin.binId} marked as repaired and reset to 0%.`);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to update bin.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={!!bin} onClose={onClose} title="🔧 Mark as Repaired">
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-gray-800">{bin?.binId}</span>
          <StatusBadge status={bin?.status} />
        </div>
        {bin && <FillBar percentage={bin.fillPercentage} />}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="repair-note">
            Repair Note <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="repair-note"
            rows={3}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Replaced sensor, cleared overflow, tightened lid hinge…"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
        </div>
        <p className="text-xs text-gray-400">
          This will reset the bin fill to 0% and status to <strong>Normal</strong>.
        </p>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={submitting}>Cancel</button>
          <button
            type="submit"
            disabled={submitting}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            {submitting ? 'Saving…' : '✅ Confirm Repair'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Bin maintenance row ───────────────────────────────────────────────────────
function BinRow({ bin, onRepair }) {
  const { needsAttn, lowBattery, offline } = getFlags(bin);
  const issues = [
    needsAttn  && { label: 'Needs Attention', color: 'bg-red-100 text-red-700',    icon: '🔧' },
    lowBattery && { label: 'Low Battery',      color: 'bg-yellow-100 text-yellow-700', icon: '🔋' },
    offline    && { label: 'Sensor Offline',   color: 'bg-gray-100 text-gray-600',  icon: '📡' },
  ].filter(Boolean);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 space-y-3 hover:shadow-md transition-shadow">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-mono font-extrabold text-gray-900 text-base">{bin.binId}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            📍 {bin.location.lat.toFixed(5)}, {bin.location.lng.toFixed(5)}
          </p>
        </div>
        <StatusBadge status={bin.status} />
      </div>

      {/* Fill bar */}
      <FillBar percentage={bin.fillPercentage} />

      {/* Issue badges */}
      <div className="flex flex-wrap gap-2">
        {issues.map(issue => (
          <span key={issue.label} className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${issue.color}`}>
            {issue.icon} {issue.label}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-gray-400">
          Last updated: {new Date(bin.lastUpdated).toLocaleString('en-IN')}
        </p>
        <button
          onClick={() => onRepair(bin)}
          className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
        >
          🔧 Mark Repaired
        </button>
      </div>
    </div>
  );
}

// ── Filter tab button ─────────────────────────────────────────────────────────
function FilterTab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${
        active
          ? 'bg-gray-900 text-white border-gray-900'
          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Maintenance() {
  const [bins,      setBins]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('all');  // 'all' | 'attention' | 'battery' | 'offline'
  const [repairBin, setRepairBin] = useState(null);
  const [success,   setSuccess]   = useState('');
  const [error,     setError]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllBins();
      setBins(res.data);
    } catch { setError('Failed to load bins.'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 5000);
    return () => clearTimeout(t);
  }, [success]);

  // Annotate every bin with its flags
  const annotated = bins.map(bin => ({ ...bin, flags: getFlags(bin) }));

  // Counts for the three diag cards
  const needsAttnCount  = annotated.filter(b => b.flags.needsAttn).length;
  const lowBattCount    = annotated.filter(b => b.flags.lowBattery).length;
  const offlineCount    = annotated.filter(b => b.flags.offline).length;
  const anyIssue        = annotated.filter(b => b.flags.needsAttn || b.flags.lowBattery || b.flags.offline);

  // Filtered list
  const filtered =
    filter === 'attention' ? annotated.filter(b => b.flags.needsAttn)  :
    filter === 'battery'   ? annotated.filter(b => b.flags.lowBattery) :
    filter === 'offline'   ? annotated.filter(b => b.flags.offline)    :
    anyIssue; // 'all' shows only bins with at least one issue

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-extrabold text-gray-900">Maintenance &amp; Diagnostics</h2>
        <p className="text-sm text-gray-400 mt-0.5">Bins requiring physical repair or sensor replacement</p>
      </div>

      {/* ── Alerts ──────────────────────────────────────── */}
      {error   && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">⚠️ {error}</div>}
      {success && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">✅ {success}</div>}

      {/* ── Diag cards (matches image exactly) ──────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <DiagCard
          icon="🔧"  iconBg="bg-red-100"    label="Needs Attention"
          value={needsAttnCount}  active={needsAttnCount > 0}
        />
        <DiagCard
          icon="🔋"  iconBg="bg-yellow-100" label="Low Battery"
          value={lowBattCount}    active={lowBattCount > 0}
        />
        <DiagCard
          icon="📡"  iconBg="bg-gray-100"   label="Sensor Offline"
          value={offlineCount}    active={offlineCount > 0}
        />
      </div>

      {/* ── All good state (matches image green box) ────── */}
      {anyIssue.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl flex flex-col items-center justify-center py-16 text-center">
          <span className="text-5xl mb-3">🔧</span>
          <p className="text-lg font-bold text-green-700">All bins are in good condition!</p>
          <p className="text-sm text-green-600 mt-1">No maintenance required at this time.</p>
        </div>
      ) : (
        <>
          {/* Filter tabs + refresh */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <FilterTab active={filter === 'all'}       onClick={() => setFilter('all')}>
                All Issues ({anyIssue.length})
              </FilterTab>
              <FilterTab active={filter === 'attention'} onClick={() => setFilter('attention')}>
                🔧 Needs Attention ({needsAttnCount})
              </FilterTab>
              <FilterTab active={filter === 'battery'}   onClick={() => setFilter('battery')}>
                🔋 Low Battery ({lowBattCount})
              </FilterTab>
              <FilterTab active={filter === 'offline'}   onClick={() => setFilter('offline')}>
                📡 Sensor Offline ({offlineCount})
              </FilterTab>
            </div>
            <button onClick={load} className="btn-secondary text-sm flex items-center gap-1.5">
              🔄 Refresh
            </button>
          </div>

          {/* Bin grid */}
          {filtered.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl flex flex-col items-center justify-center py-12 text-center">
              <span className="text-4xl mb-2">✅</span>
              <p className="text-gray-500 font-medium">No bins match this filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(bin => (
                <BinRow key={bin._id} bin={bin} onRepair={setRepairBin} />
              ))}
            </div>
          )}

          {/* Summary strip */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">System Health Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {[
                { label: 'Total Bins',       value: bins.length,            color: 'text-gray-800'   },
                { label: 'Healthy Bins',     value: bins.length - anyIssue.length, color: 'text-green-600' },
                { label: 'Bins w/ Issues',   value: anyIssue.length,        color: 'text-red-500'    },
                { label: 'Health Rate',      value: bins.length
                    ? `${Math.round(((bins.length - anyIssue.length) / bins.length) * 100)}%`
                    : '—',                                                   color: 'text-blue-600'   },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-xl py-3">
                  <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Repair modal ────────────────────────────────── */}
      {repairBin && (
        <RepairModal
          bin={repairBin}
          onClose={() => setRepairBin(null)}
          onSuccess={(msg) => { setSuccess(msg); load(); }}
        />
      )}
    </div>
  );
}
