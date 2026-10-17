import FillBar from './FillBar';
import StatusBadge from './StatusBadge';

/**
 * CriticalAlertsTable
 * Props:
 *   bins       – array of critical bin objects (with openTasks attached)
 *   onAssign   – (bin) => void  called when "Assign Task" is clicked
 *   loading    – boolean
 */
export default function CriticalAlertsTable({ bins, onAssign, loading }) {
  if (loading) {
    return (
      <div className="card space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (bins.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <span className="text-5xl mb-3">✅</span>
        <p className="text-gray-500 font-medium">All bins are operating normally.</p>
        <p className="text-sm text-gray-400 mt-1">No critical alerts at this time.</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Desktop table (md+) ──────────────────────────────── */}
      <div className="card p-0 overflow-hidden hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="px-5 py-3">Bin ID</th>
              <th className="px-5 py-3">Location</th>
              <th className="px-5 py-3 w-48">Fill Level</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Last Updated</th>
              <th className="px-5 py-3">Open Tasks</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {bins.map((bin) => {
              const hasOpenTask = bin.openTasks?.length > 0;
              return (
                <tr
                  key={bin._id}
                  className="hover:bg-red-50/40 transition-colors"
                >
                  <td className="px-5 py-4 font-mono font-semibold text-gray-800">
                    {bin.binId}
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-xs">
                    <span className="block">{bin.location.lat.toFixed(5)}</span>
                    <span className="block">{bin.location.lng.toFixed(5)}</span>
                  </td>
                  <td className="px-5 py-4 w-48">
                    <FillBar percentage={bin.fillPercentage} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={bin.status} />
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(bin.lastUpdated).toLocaleString()}
                  </td>
                  <td className="px-5 py-4">
                    {hasOpenTask ? (
                      <span className="badge-inprogress">
                        {bin.openTasks.length} active
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">None</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {hasOpenTask ? (
                      <span className="text-xs text-gray-400 italic">Already assigned</span>
                    ) : (
                      <button
                        onClick={() => onAssign(bin)}
                        className="btn-danger text-xs px-3 py-1.5"
                      >
                        🚛 Assign Task
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards (< md) ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {bins.map((bin) => {
          const hasOpenTask = bin.openTasks?.length > 0;
          return (
            <div
              key={bin._id}
              className="card border-l-4 border-red-500 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono font-semibold text-gray-800">{bin.binId}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    📍 {bin.location.lat.toFixed(4)}, {bin.location.lng.toFixed(4)}
                  </p>
                </div>
                <StatusBadge status={bin.status} />
              </div>

              <FillBar percentage={bin.fillPercentage} />

              <div className="flex items-center justify-between pt-1">
                <div>
                  {hasOpenTask ? (
                    <span className="badge-inprogress">{bin.openTasks.length} task active</span>
                  ) : (
                    <span className="text-xs text-gray-400 italic">No open tasks</span>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(bin.lastUpdated).toLocaleString()}
                  </p>
                </div>
                {!hasOpenTask && (
                  <button
                    onClick={() => onAssign(bin)}
                    className="btn-danger text-xs px-3 py-1.5 shrink-0"
                  >
                    🚛 Assign
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
