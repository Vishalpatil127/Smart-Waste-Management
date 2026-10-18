import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function CollectionComplete() {
  const location = useLocation();
  const navigate = useNavigate();
  const { task, bin, user } = location.state ?? {};

  const [photo,     setPhoto]     = useState(null);
  const [photoURL,  setPhotoURL]  = useState(null);
  const [gps,       setGps]       = useState('Fetching GPS…');
  const [timestamp] = useState(new Date());
  const [animate,   setAnimate]   = useState(false);
  const fileRef = useRef();

  // Animate tick on mount
  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Get GPS
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setGps(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`),
        ()  => setGps(`${bin?.location?.lat?.toFixed(4) ?? '—'}, ${bin?.location?.lng?.toFixed(4) ?? '—'}`)
      );
    } else {
      setGps(`${bin?.location?.lat?.toFixed(4) ?? '—'}, ${bin?.location?.lng?.toFixed(4) ?? '—'}`);
    }
  }, [bin]);

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPhotoURL(URL.createObjectURL(file));
  };

  if (!task || !bin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-3">
        <span className="text-4xl">⚠️</span>
        <p className="text-gray-500">No completion data found.</p>
        <button onClick={() => navigate('/emp/tasks')} className="btn-primary text-sm">← Back to Tasks</button>
      </div>
    );
  }

  const details = [
    { icon: '👤', label: 'Employee',  value: user?.name ?? '—' },
    { icon: '🗑️', label: 'Bin ID',    value: bin.binId },
    { icon: '🕐', label: 'Timestamp', value: timestamp.toLocaleString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) },
    { icon: '📍', label: 'Location',  value: bin.binId.startsWith('KOP') ? 'Kopargaon' : 'Shirdi' },
    { icon: '🛰️', label: 'GPS',       value: gps },
  ];

  return (
    <div className="max-w-sm mx-auto space-y-5">

      {/* ── Success animation ─────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-6 py-8 text-center">
        {/* Animated tick circle */}
        <div className={`mx-auto mb-4 h-20 w-20 rounded-full bg-green-500 flex items-center justify-center
          shadow-lg transition-all duration-500 ${animate ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
          <span className="text-white text-4xl font-black">✓</span>
        </div>

        {/* Confetti dots */}
        <div className={`flex justify-center gap-2 mb-4 transition-all duration-700 ${animate ? 'opacity-100' : 'opacity-0'}`}>
          {['bg-yellow-400','bg-green-400','bg-blue-400','bg-red-400','bg-purple-400'].map((c,i) => (
            <span key={i} className={`h-2 w-2 rounded-full ${c} animate-bounce`}
              style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>

        <h2 className="text-xl font-extrabold text-gray-900">Collection Completed!</h2>
        <p className="text-sm text-gray-400 mt-1">Bin has been emptied successfully.</p>
      </div>

      {/* ── Completion details ────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-5 py-5 space-y-3">
        {details.map(d => (
          <div key={d.label} className="flex items-center gap-3 py-1 border-b border-gray-50 last:border-0">
            <span className="text-lg w-6 text-center shrink-0">{d.icon}</span>
            <span className="text-xs text-gray-400 w-20 shrink-0 font-semibold">{d.label}</span>
            <span className="text-sm font-bold text-gray-800 truncate">{d.value}</span>
          </div>
        ))}
      </div>

      {/* ── Photo proof ───────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-5 py-5 space-y-3">
        <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
          📷 Photo Proof
          <span className="text-xs text-gray-400 font-normal">(Optional)</span>
        </p>

        {photoURL ? (
          <div className="relative">
            <img src={photoURL} alt="Proof" className="w-full h-40 object-cover rounded-2xl border border-gray-200" />
            <button
              onClick={() => { setPhoto(null); setPhotoURL(null); }}
              className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg"
            >✕ Remove</button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 hover:border-green-400 rounded-2xl py-6 flex flex-col items-center gap-2 transition-colors group"
          >
            <span className="text-3xl">📸</span>
            <p className="text-sm font-semibold text-gray-500 group-hover:text-green-600 transition-colors">
              Tap to take or upload photo
            </p>
            <p className="text-xs text-gray-400">JPG, PNG supported</p>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhoto}
          className="hidden"
        />
      </div>

      {/* ── Task ID ref ───────────────────────────────────── */}
      <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center justify-between">
        <span className="text-xs text-green-700 font-semibold">Task Reference</span>
        <span className="font-mono text-sm font-extrabold text-green-800">{task.taskId}</span>
      </div>

      {/* ── Back button ───────────────────────────────────── */}
      <button
        onClick={() => navigate('/emp/tasks')}
        className="w-full bg-green-700 hover:bg-green-800 text-white font-extrabold text-base py-4 rounded-2xl transition-colors shadow-lg"
      >
        ← Back to Tasks
      </button>
    </div>
  );
}
