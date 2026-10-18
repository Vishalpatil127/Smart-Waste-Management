import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import Spinner from '../../components/Spinner';

// ── Custom map icons ──────────────────────────────────────────────────────────
const binIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="background:${color};width:36px;height:36px;border-radius:50%;
    border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4);
    display:flex;align-items:center;justify-content:center;font-size:18px">🗑️</div>`,
  iconSize: [36, 36], iconAnchor: [18, 18],
});

const userIcon = L.divIcon({
  className: '',
  html: `<div style="background:#2563eb;width:30px;height:30px;border-radius:50%;
    border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4);
    display:flex;align-items:center;justify-content:center;font-size:14px">📍</div>`,
  iconSize: [30, 30], iconAnchor: [15, 15],
});

// Fit map to both markers
function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length >= 2) {
      map.fitBounds(positions, { padding: [60, 60] });
    }
  }, [map, positions]);
  return null;
}

// ── Haversine distance ────────────────────────────────────────────────────────
function distanceKm(lat1, lng1, lat2, lng2) {
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a    = Math.sin(dLat / 2) ** 2 +
               Math.cos((lat1 * Math.PI) / 180) *
               Math.cos((lat2 * Math.PI) / 180) *
               Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Priority helpers ──────────────────────────────────────────────────────────
const getPriority = (fill) => fill > 80 ? 'High Priority' : fill > 50 ? 'Medium Priority' : 'Low Priority';
const getPriorityColor = (fill) => fill > 80 ? 'text-red-500' : fill > 50 ? 'text-yellow-500' : 'text-green-600';
const getBinIconColor = (fill) => fill > 80 ? '#ef4444' : fill > 50 ? '#f59e0b' : '#22c55e';

export default function NavigateToBin() {
  const location = useLocation();
  const navigate = useNavigate();
  const { task, bin } = location.state ?? {};

  const [userPos,    setUserPos]    = useState(null);
  const [geoError,   setGeoError]   = useState('');
  const [locating,   setLocating]   = useState(true);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported by your browser.');
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      () => {
        // Fallback: use zone centre
        const fallback = bin?.binId?.startsWith('KOP')
          ? [19.8858, 74.4775]
          : [19.7670, 74.4780];
        setUserPos(fallback);
        setGeoError('Using approximate location (GPS unavailable).');
        setLocating(false);
      },
      { timeout: 6000 }
    );
  }, [bin]);

  if (!task || !bin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-3">
        <span className="text-4xl">⚠️</span>
        <p className="text-gray-500">No bin data found.</p>
        <button onClick={() => navigate('/emp/tasks')} className="btn-primary text-sm">← Back to Tasks</button>
      </div>
    );
  }

  const binPos    = [bin.location.lat, bin.location.lng];
  const positions = userPos ? [userPos, binPos] : [binPos];
  const distKm    = userPos ? distanceKm(userPos[0], userPos[1], binPos[0], binPos[1]) : null;
  const eta       = distKm ? Math.ceil((distKm / 20) * 60) : null; // ~20 km/h

  const openGoogleMaps = () => {
    setNavigating(true);
    const dest = `${binPos[0]},${binPos[1]}`;
    const url  = userPos
      ? `https://www.google.com/maps/dir/${userPos[0]},${userPos[1]}/${dest}`
      : `https://www.google.com/maps/search/?api=1&query=${dest}`;
    window.open(url, '_blank');
    setTimeout(() => setNavigating(false), 2000);
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto">

      {/* ── Back button ──────────────────────────────────── */}
      <button
        onClick={() => navigate('/emp/tasks')}
        className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
      >
        ← Navigate to Bin
      </button>

      {/* ── Bin info card (matches image header) ─────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
        <div className="flex items-center gap-4">
          <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0`}
               style={{ background: getBinIconColor(bin.fillPercentage) }}>
            <span className="text-white text-xl">🗑️</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-extrabold text-gray-900">Bin ID: {bin.binId}</p>
              <span className="text-gray-300">›</span>
            </div>
            <p className={`text-sm font-bold ${getPriorityColor(bin.fillPercentage)}`}>
              Fill Level: {bin.fillPercentage}% ({getPriority(bin.fillPercentage)})
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              📍 {bin.location.lat.toFixed(5)}, {bin.location.lng.toFixed(5)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Geo warning ──────────────────────────────────── */}
      {geoError && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          ⚠️ {geoError}
        </div>
      )}

      {/* ── Map ──────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: '320px' }}>
        {locating ? (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <Spinner size="md" />
          </div>
        ) : (
          <MapContainer
            center={binPos}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Bin marker */}
            <Marker position={binPos} icon={binIcon(getBinIconColor(bin.fillPercentage))}>
              <Popup>
                <div className="text-sm font-bold">{bin.binId}</div>
                <div className="text-xs text-gray-500">{bin.fillPercentage}% full</div>
              </Popup>
            </Marker>
            {/* User marker */}
            {userPos && (
              <Marker position={userPos} icon={userIcon}>
                <Popup><span className="text-sm font-bold">Your location</span></Popup>
              </Marker>
            )}
            {/* Route line */}
            {userPos && (
              <Polyline
                positions={[userPos, binPos]}
                pathOptions={{ color: '#2563eb', weight: 4, dashArray: '8 6' }}
              />
            )}
            <FitBounds positions={positions} />
          </MapContainer>
        )}
      </div>

      {/* ── Direction hint card ───────────────────────────── */}
      {distKm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xl">↪</span>
          </div>
          <div>
            <p className="font-bold text-gray-800">
              {distKm < 1
                ? `${Math.round(distKm * 1000)} m away`
                : `${distKm.toFixed(1)} km away`}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Estimated travel time ~{eta} min · Turn-by-turn via Google Maps
            </p>
          </div>
        </div>
      )}

      {/* ── Distance chips ───────────────────────────────── */}
      {distKm && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Distance',  value: distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(2)} km`, icon: '📏' },
            { label: 'Est. Time', value: `~${eta} min`, icon: '⏱️' },
            { label: 'Priority',  value: getPriority(bin.fillPercentage).split(' ')[0], icon: '⚠️' },
          ].map(c => (
            <div key={c.label} className="bg-gray-50 rounded-xl px-3 py-3 text-center border border-gray-100">
              <p className="text-lg">{c.icon}</p>
              <p className="font-extrabold text-gray-800 text-sm mt-0.5">{c.value}</p>
              <p className="text-xs text-gray-400">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Start Navigation button ───────────────────────── */}
      <button
        onClick={openGoogleMaps}
        disabled={navigating}
        className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-70 text-white font-extrabold text-base py-4 rounded-2xl transition-colors flex items-center justify-center gap-3 shadow-lg"
      >
        <span className="text-xl">🚀</span>
        {navigating ? 'Opening Maps…' : 'Start Navigation'}
      </button>

      {/* ── Task info footer ─────────────────────────────── */}
      <div className="bg-gray-50 rounded-2xl border border-gray-100 px-5 py-3 flex items-center justify-between text-xs text-gray-400">
        <span>Task: <span className="font-mono font-bold text-gray-600">{task.taskId}</span></span>
        <span>Assigned {new Date(task.timestamp).toLocaleDateString('en-IN')}</span>
      </div>
    </div>
  );
}
