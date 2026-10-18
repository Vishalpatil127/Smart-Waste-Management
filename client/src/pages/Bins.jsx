import { useEffect, useState, useCallback } from 'react';
import { getAllBins, updateBin } from '../services/binService';
import FillBar from '../components/FillBar';
import StatusBadge from '../components/StatusBadge';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';

// ── Helpers ───────────────────────────────────────────────────────────────────
const deriveStatus = (fill) =>
  fill > 80 ? 'Critical' : fill > 50 ? 'Warning' : 'Normal';

const STATUS_FILTERS = ['All', 'Normal', 'Warning', 'Critical'];

const ZONE_LABEL = (binId) =>
  binId?.startsWith('KOP') ? '🏘️ Kopargaon' :
  binId?.startsWith('SHR') ? '🛕 Shirdi'    : '—';

// ── Fill-level editor modal ───────────────────────────────────────────────────
function AdjustFillModal({ bin, onClose, onSuccess }) {
  const [fill,       setFill]       = useState(bin?.fillPercentage ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  // Reset whenever a new bin is passed in
  useEffect(() => {
    if (bin) { setFill(bin.fillPercentage); setError(''); }
  }, [bin]);

  if (!bin) return null;

  const preview = deriveStatus(Number(fill));

  const sliderColor =
    fill > 80 ? 'accent-red-500' :
    fill > 50 ? 'accent-yellow-500' : 'accent-green-500';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = Number(fill);
    if (isNaN(val) || val < 0 || val > 100) {
      setError('Fill must be between 0 and 100.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await updateBin({
        binId:          bin.binId,
        fillPercentage: val,
        lat:            bin.location.lat,
        lng:            bin.location.lng,
      });
      onSuccess(bin.binId, val, preview);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Update failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={!!bin} onClose={onClose} title="🎚️ Adjust Bin Fill Level">

      {/* Bin identity card */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 mb-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono font-extrabold text-gray-900 text-base">{bin.binId}</p>
            <p className="text-xs text-gray-400 mt-0.5">{ZONE_LABEL(bin.binId)}</p>
          </div>
          <StatusBadge status={bin.status} />
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Current fill</p>
          <FillBar percentage={bin.fillPercentage} />
        </div>
      </div>

      {/* Adjustment form */}
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Big % display */}
        <div className="text-center">
          <span className={`text-6xl font-black tabular-nums ${
            fill > 80 ? 'text-red-500' :
            fill > 50 ? 'text-yellow-500' : 'text-green-600'
          }`}>
            {fill}
          </span>
          <span className="text-2xl font-bold text-gray-400">%</span>
        </div>

        {/* Slider */}
        <div className="space-y-2">
          <input
            type="range" min="0" max="100" step="1"
            value={fill}
            onChange={e => setFill(Number(e.target.value))}
            className={`w-full h-3 rounded-full cursor-pointer ${sliderColor}`}
          />
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-green-600">0% — Normal</span>
            <span className="text-yellow-500">50% — Warning</span>
            <span className="text-red-500">80% — Critical</span>
          </div>
        </div>

        {/* Quick-set buttons */}
        <div>
          <p className="text-xs text-gray-500 font-semibold mb-2">Quick set</p>
          <div className="grid grid-cols-4 gap-2">
            {[0, 25, 50, 75, 85, 90, 95, 100].map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setFill(v)}
                className={`py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                  fill === v
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {v}%
              </button>
            ))}
          </div>
        </div>

        {/* Number input */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">
            Or type a value (0–100)
          </label>
          <input
            type="number" min="0" max="100"
            value={fill}
            onChange={e => setFill(Math.min(100, Math.max(0, Number(e.target.value))))}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Status preview */}
        <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
          <span className="text-sm text-gray-500 font-medium">New status will be</span>
          <StatusBadge status={preview} />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={onClose} disabled={submitting} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || fill === bin.fillPercentage}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl transition-colors"
          >
            {submitting ? 'Saving…' : '✅ Apply'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Bin card ──────────────────────────────────────────────────────────────────
function BinCard({ bin, onAdjust }) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden ${
      bin.status === 'Critical' ? 'border-red-200' :
      bin.status === 'Warning'  ? 'border-yellow-200' : 'border-gray-100'
    }`}>
      {/* Coloured top strip */}
      <div className={`h-1.5 w-full ${
        bin.status === 'Critical' ? 'bg-red-500' :
        bin.status === 'Warning'  ? 'bg-yellow-400' : 'bg-green-500'
      }`} />

      <div className="px-5 py-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-mono font-extrabold text-gray-900 text-sm">{bin.binId}</p>
            <p className="text-xs text-gray-400 mt-0.5">{ZONE_LABEL(bin.binId)}</p>
          </div>
          <StatusBadge status={bin.status} />
        </div>

        {/* Fill bar */}
        <FillBar percentage={bin.fillPercentage} />

        {/* Coords */}
        <p className="text-xs text-gray-400">
          📍 {bin.location.lat.toFixed(5)}, {bin.location.lng.toFixed(5)}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-gray-400">
            {new Date(bin.lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <button
            onClick={() => onAdjust(bin)}
            className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors"
          >
            🎚️ Adjust Fill
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bins page ─────────────────────────────────────────────────────────────────
export default function Bins() {
  const [bins,      setBins]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('All');
  const [search,    setSearch]    = useState('');
  const [sortBy,    setSortBy]    = useState('fill-desc'); // 'fill-desc' | 'fill-asc' | 'id'
  const [adjustBin, setAdjustBin] = useState(null);
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

  // Auto-dismiss success
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(''), 5000);
    return () => clearTimeout(t);
  }, [success]);

  // Derived stats
  const critical = bins.filter(b => b.status === 'Critical').length;
  const warning  = bins.filter(b => b.status === 'Warning').length;
  const normal   = bins.filter(b => b.status === 'Normal').length;
  const avgFill  = bins.length
    ? Math.round(bins.reduce((s, b) => s + b.fillPercentage, 0) / bins.length)
    : 0;

  // Filter + search + sort
  const visible = bins
    .filter(b => filter === 'All' || b.status === filter)
    .filter(b => b.binId.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sortBy === 'fill-desc' ? b.fillPercentage - a.fillPercentage :
      sortBy === 'fill-asc'  ? a.fillPercentage - b.fillPercentage :
      a.binId.localeCompare(b.binId)
    );

  const handleAdjustSuccess = (binId, newFill, newStatus) => {
    // Optimistic local update
    setBins(prev => prev.map(b =>
      b.binId === binId
        ? { ...b, fillPercentage: newFill, status: newStatus, lastUpdated: new Date().toISOString() }
        : b
    ));
    setSuccess(`✅ ${binId} updated to ${newFill}% (${newStatus})`);
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900">Live Bins</h2>
          <p className="text-sm text-gray-400 mt-0.5">Monitor and manually adjust fill levels across all zones</p>
        </div>
        <button onClick={load} className="btn-secondary text-sm flex items-center gap-1.5">
          🔄 Refresh
        </button>
      </div>

      {/* ── Alerts ──────────────────────────────────────── */}
      {error   && <div className="text-sm text-red-700   bg-red-50   border border-red-200   rounded-xl px-4 py-3">⚠️ {error}</div>}
      {success && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">{success}</div>}

      {/* ── Summary strip ───────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Bins',  value: bins.length, color: 'text-gray-800',   bg: 'bg-gray-50',   icon: '🗑️' },
          { label: 'Critical',    value: critical,    color: 'text-red-600',    bg: 'bg-red-50',    icon: '🔴' },
          { label: 'Warning',     value: warning,     color: 'text-yellow-600', bg: 'bg-yellow-50', icon: '🟡' },
          { label: 'Avg Fill',    value: `${avgFill}%`, color: 'text-blue-600', bg: 'bg-blue-50',   icon: '📊' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3`}>
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Controls row ────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search bin ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Status filter */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {STATUS_FILTERS.map(s => (
            <button key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s} {s !== 'All' && `(${bins.filter(b => b.status === s).length})`}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="fill-desc">Fill ↓ (High first)</option>
          <option value="fill-asc">Fill ↑ (Low first)</option>
          <option value="id">Bin ID A–Z</option>
        </select>
      </div>

      {/* ── Results count ───────────────────────────────── */}
      <p className="text-xs text-gray-400 font-medium">
        Showing <span className="text-gray-700 font-bold">{visible.length}</span> of {bins.length} bins
        {search && ` matching "${search}"`}
        {filter !== 'All' && ` · ${filter} only`}
      </p>

      {/* ── Bin grid ────────────────────────────────────── */}
      {visible.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl flex flex-col items-center py-16 text-center">
          <span className="text-4xl mb-2">🔍</span>
          <p className="text-gray-500 font-medium">No bins match your search or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map(bin => (
            <BinCard key={bin._id} bin={bin} onAdjust={setAdjustBin} />
          ))}
        </div>
      )}

      {/* ── Bulk actions bar ────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-6 py-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Bulk Quick-Set</h3>
        <div className="flex flex-wrap gap-3 items-center">
          <p className="text-xs text-gray-400">Set all <span className="font-semibold text-red-500">Critical</span> bins to:</p>
          {[0, 50].map(val => (
            <button
              key={val}
              onClick={async () => {
                const critBins = bins.filter(b => b.status === 'Critical');
                await Promise.all(critBins.map(b =>
                  updateBin({ binId: b.binId, fillPercentage: val, lat: b.location.lat, lng: b.location.lng })
                ));
                setSuccess(`All ${critBins.length} critical bins reset to ${val}%.`);
                load();
              }}
              className="bg-gray-900 hover:bg-gray-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
            >
              {val}%
            </button>
          ))}
          <span className="text-gray-300">|</span>
          <p className="text-xs text-gray-400">Reset <span className="font-semibold text-gray-700">all bins</span> to:</p>
          <button
            onClick={async () => {
              await Promise.all(bins.map(b =>
                updateBin({ binId: b.binId, fillPercentage: 0, lat: b.location.lat, lng: b.location.lng })
              ));
              setSuccess(`All ${bins.length} bins reset to 0%.`);
              load();
            }}
            className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
          >
            0% (Empty All)
          </button>
        </div>
      </div>

      {/* ── Adjust modal ────────────────────────────────── */}
      <AdjustFillModal
        bin={adjustBin}
        onClose={() => setAdjustBin(null)}
        onSuccess={handleAdjustSuccess}
      />
    </div>
  );
}
