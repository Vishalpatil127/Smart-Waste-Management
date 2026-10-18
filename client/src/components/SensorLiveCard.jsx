import { useEffect, useState } from 'react';
import { subscribeToAllSensors } from '../services/firebase';
import FillBar from './FillBar';
import StatusBadge from './StatusBadge';

/**
 * SensorLiveCard
 * Shows raw ESP32 sensor data straight from Firebase RTDB.
 * No MongoDB involvement — pure real-time feed.
 *
 * Props:
 *   compact – boolean  render a smaller version for embedding
 */
export default function SensorLiveCard({ compact = false }) {
  const [sensors, setSensors] = useState({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const unsub = subscribeToAllSensors((data) => {
      setSensors(data);
      setConnected(true);
    });
    return () => unsub?.();
  }, []);

  const entries = Object.entries(sensors);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-base">📡</span>
          <h3 className={`font-bold text-gray-800 ${compact ? 'text-sm' : 'text-base'}`}>
            Live Sensor Feed
          </h3>
          <span className="text-xs text-gray-400 font-mono">Firebase RTDB</span>
        </div>
        {/* Live / connecting indicator */}
        <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
          connected ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'
        }`}>
          <span className={`h-2 w-2 rounded-full ${
            connected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
          }`} />
          {connected ? 'Connected' : 'Connecting…'}
        </div>
      </div>

      {/* Sensor rows */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <div className="h-8 w-8 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-400">Waiting for sensor data…</p>
          <p className="text-xs text-gray-300 mt-1">
            ESP32 writes to <span className="font-mono">/bins</span> in Firebase RTDB
          </p>
        </div>
      ) : (
        <div className={`divide-y divide-gray-50 ${compact ? 'max-h-56 overflow-y-auto' : ''}`}>
          {entries.map(([binId, sensor]) => {
            const fill   = sensor.fillPercentage ?? 0;
            const status = fill > 80 ? 'Critical' : fill > 50 ? 'Warning' : 'Normal';

            return (
              <div key={binId} className="px-5 py-3.5 space-y-2">
                {/* Top row */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-gray-800 text-sm">{binId}</span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={status} />
                    <span className="text-xs text-gray-400">
                      {sensor.lastUpdated
                        ? new Date(sensor.lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Fill bar */}
                <FillBar percentage={fill} />

                {/* Raw sensor fields */}
                {!compact && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[
                      { label: 'Fill %',       value: `${fill}%`,                          color: fill > 80 ? 'text-red-500' : fill > 50 ? 'text-yellow-500' : 'text-green-600' },
                      { label: 'Distance',     value: sensor.distanceCm  != null ? `${sensor.distanceCm} cm`  : '—', color: 'text-blue-600'  },
                      { label: 'Bin Height',   value: sensor.binHeightCm != null ? `${sensor.binHeightCm} cm` : '—', color: 'text-gray-600'  },
                    ].map(f => (
                      <div key={f.label} className="bg-gray-50 rounded-xl px-3 py-2 text-center">
                        <p className={`text-sm font-bold ${f.color}`}>{f.value}</p>
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
