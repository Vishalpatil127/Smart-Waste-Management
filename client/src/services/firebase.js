import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getDatabase, ref, onValue, set } from 'firebase/database';

// ── Config from environment variables ────────────────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// ── Initialize app (singleton) ────────────────────────────────────────────────
const app = initializeApp(firebaseConfig);

// ── Firestore (structured real-time data) ────────────────────────────────────
export const db = getFirestore(app);

// ── Realtime Database (low-latency ESP32 sensor sync) ────────────────────────
export const rtdb = getDatabase(app);

// ─────────────────────────────────────────────────────────────────────────────
// Firestore helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Subscribe to real-time bin updates from Firestore.
 * Returns an unsubscribe function — call it in useEffect cleanup.
 *
 * @param {Function} onData  Called with array of bin objects on every change
 * @param {Function} onError Called if Firestore throws
 */
export function subscribeToBins(onData, onError) {
  const binsRef = collection(db, 'bins');
  return onSnapshot(
    binsRef,
    (snapshot) => {
      const bins = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(bins);
    },
    (err) => {
      console.error('[Firebase] Firestore bins error:', err);
      onError?.(err);
    }
  );
}

/**
 * Subscribe to real-time task updates from Firestore.
 */
export function subscribeToTasks(onData, onError) {
  const tasksRef = collection(db, 'tasks');
  return onSnapshot(
    tasksRef,
    (snapshot) => {
      const tasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(tasks);
    },
    (err) => {
      console.error('[Firebase] Firestore tasks error:', err);
      onError?.(err);
    }
  );
}

/**
 * Write or update a single bin document in Firestore.
 * Called from the frontend after a manual fill level update.
 */
export async function syncBinToFirestore(bin) {
  try {
    await setDoc(
      doc(db, 'bins', bin.binId),
      {
        binId:          bin.binId,
        fillPercentage: bin.fillPercentage,
        status:         bin.status,
        location:       bin.location,
        lastUpdated:    serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('[Firebase] syncBinToFirestore error:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Realtime Database helpers (ESP32 sensor data — ultra low latency)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Subscribe to a specific bin's live sensor data via RTDB.
 * ESP32 writes to /sensors/<binId> directly.
 */
export function subscribeToBinSensor(binId, onChange) {
  const sensorRef = ref(rtdb, `sensors/${binId}`);
  return onValue(sensorRef, (snapshot) => {
    if (snapshot.exists()) onChange(snapshot.val());
  });
}

/**
 * Subscribe to all sensor readings at once.
 */
export function subscribeToAllSensors(onChange) {
  const sensorsRef = ref(rtdb, 'sensors');
  return onValue(sensorsRef, (snapshot) => {
    if (snapshot.exists()) onChange(snapshot.val());
  });
}

export default app;
