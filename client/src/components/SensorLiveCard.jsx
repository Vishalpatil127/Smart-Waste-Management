import { useEffect, useState } from 'react';
import { getDatabase, ref, onValue } from 'firebase/database';
import FillBar from './FillBar';
import StatusBadge from './StatusBadge';
import app from '../services/firebase';

/**
 * SensorLiveCard — directly connects to Firebase RTDB.
 * Reads from /bins/* matching your ESP32 structure:
 *   BIN001 → { binHeightCm, distanceCm, fillPercent, updatedAt }
 */
export default function SensorLiveCard({ compact = false }) {
  const [sensors,   setSensors]   = useState({});
  const [status,    setStatus]    = useState('connecting'); // connecting | connected | error
  const [errMsg,    setErrMsg]    = useState('');

  useEffect(() => {
    const rtdb    = getDatabase(app);
    const binsRef = ref(rtdb, 'bins');   // exact path from your Firebase console

    const unsub = onValue(
      binsRef,
      (snapshot) => {
        setStatus('connected');
        if (!snapshot.exists()) {
          setSensors({});
          return;
        }

        const raw        = snapshot.val();
        const normalised = {};

        Object.entries(raw).forEach(([binId, data]) => {
          if (!data) return;

          // fillPercent sent by ESP32; compute from distance as fallback
          let fill = data.fillPercent ?? data.fillPercentage ?? null;
          if (fill === null && data.binHeightCm != null && data.distanceCm != null) {
            fill = Math.round(
              Math.max(0, ((data.binHeightCm - data.distanceCm) / data.binHeightCm) * 100)
            );
          }
          fill = Math.min(100, Math.max(0, Number(fill ?? 0)));

          normalised[binId] = {
            binId,
            fillPercentage: fill,
            distanceCm:     data.distanceCm,
            binHeightCm:    data.binHeightCm,
            fillPercent:    data.fillPercent,
            lastUpdated:    data.updatedAt
              ? new Date(data.updatedAt * 1000).toLocaleTimeString('en-IN', {
                  hour: '2-digit', minute: '2-digit', second: '2-digit',
                })
              : '—',
          };
        });

        setSensors(normalised);
      },
      (err) => {
        console.error('[SensorLiveCard] RTDB error:', err.code, err.message);
        setStatus('error');
        setErrMsg(err.code === 'PERMISSION_DENIED'
          ? 'Firebase rules block read access. Set ".read": true in RTDB rules.'
          : err.message);
      }
    );

    return () => unsub();
  }, []);

  const entries = Object.entries(sensors);

  // ── Status badge ──────────────────────────────────────────────────────────
  const StatusPill = () => (
    <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
      status === 'connected' ? 'bg-green-50  text-green-700' :
      status === 'error'     ? 'bg-red-50    text-red-600'   :
                               'bg-gray-100  text-gray-400'
    }`}>
      <span className={`h-2 w-2 rounded-full ${
        status === 'connected' ? 'bg-green-500 animate-pulse' :
        status === 'error'     ? 'bg-red-500'                  :
                                 'bg-gray-300 animate-pulse'
      }`} />
      {status === 'connected' ? 'Live' :
       status === 'error'     ? 'Error' : 'Connecting…'}
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-base">📡</span>
          <h3 className="font-bold text-gray-800 text-sm">Live Sensor Feed</h3>
          <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full font-mono">
            Firebase RTDB /bins
          </span>
        </div>
        <StatusPill />
      </div>

      {/* Error state */}
      {status === 'error' && (
        <div className="px-5 py-5 space-y-3">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm font-bold text-red-700 mb-1">⚠️ Firebase RTDB Read Blocked</p>
            <p className="text-xs text-red-600">{errMsg}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 space-y-1">
            <p className="font-bold">Fix: Update RTDB Rules in Firebase Console</p>
            <p>Go to: <span className="font-mono">Firebase → Realtime Database → Rules</span></p>
            <pre className="bg-white border border-amber-200 rounded-lg p-2 mt-1 text-xs font-mono">
{`{
  "rules": {
    ".read": true,
    ".write": true
  }
}`}
            </pre>
            <p className="text-amber-600 mt-1">Then click <strong>Publish</strong>.</p>
          </div>
        </div>
      )}

      {/* Connecting state */}
      {status === 'connecting' && (
        <div className="flex flex-col items-center py-10 text-center">
          <div className="h-8 w-8 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-500 font-medium">Connecting to Firebase RTDB…</p>
          <p className="text-xs text-gray-400 mt-1">
            Reading from <span className="font-mono text-gray-500">/bins</span>
          </p>
        </div>
      )}

      {/* Connected — no data */}
      {status === 'connected' && entries.length === 0 && (
        <div className="flex flex-col items-center py-10 text-center">
          <span className="text-4xl mb-2">📭</span>
          <p className="text-sm text-gray-500 font-medium">Connected — no bin data yet.</p>
          <p className="text-xs text-gray-400 mt-1">Waiting for ESP32 to send readings…</p>
        </div>
      )}

      {/* Connected — has data */}
      {status === 'connected' && entries.length > 0 && (
        <div className={`divide-y divide-gray-50 ${compact ? 'max-h-52 overflow-y-auto' : ''}`}>
          {entries.map(([binId, sensor]) => {
            const fill   = sensor.fillPercentage ?? 0;
            const bstatus = fill > 80 ? 'Critical' : fill > 50 ? 'Warning' : 'Normal';

            return (
              <div key={binId} className="px-5 py-4 space-y-2.5">
                {/* Row header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-gray-900 text-sm">{binId}</span>
                    <StatusBadge status={bstatus} />
                  </div>
                  <span className="text-xs text-gray-400 font-mono">{sensor.lastUpdated}</span>
                </div>

                {/* Fill bar */}
                <FillBar percentage={fill} />

                {/* Sensor detail chips */}
                {!compact && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        label: 'Fill Level',
                        value: `${fill}%`,
                        color: fill > 80 ? 'text-red-600' : fill > 50 ? 'text-yellow-600' : 'text-green-600',
                        bg:    fill > 80 ? 'bg-red-50'   : fill > 50 ? 'bg-yellow-50'     : 'bg-green-50',
                      },
                      {
                        label: 'Distance',
                        value: sensor.distanceCm != null ? `${sensor.distanceCm} cm` : '—',
                        color: 'text-blue-600', bg: 'bg-blue-50',
                      },
                      {
                        label: 'Bin Height',
                        value: sensor.binHeightCm != null ? `${sensor.binHeightCm} cm` : '—',
                        color: 'text-gray-700', bg: 'bg-gray-50',
                      },
                    ].map(f => (
                      <div key={f.label} className={`${f.bg} rounded-xl px-3 py-2.5 text-center border border-gray-100`}>
                        <p className={`text-base font-extrabold ${f.color}`}>{f.value}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{f.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
