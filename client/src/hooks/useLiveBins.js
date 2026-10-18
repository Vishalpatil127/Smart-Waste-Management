import { useEffect, useState, useRef } from 'react';
import { subscribeToBins, subscribeToAllSensors } from '../services/firebase';
import { getAllBins } from '../services/binService';

/**
 * useLiveBins
 * -----------
 * Returns live bin data. Strategy:
 *   1. Immediately fetches from MongoDB via REST API (fast first paint).
 *   2. Subscribes to Firestore for real-time structural updates.
 *   3. Subscribes to RTDB /sensors for ESP32 fill-level patches.
 *
 * The three sources are merged so the UI always reflects the latest state.
 */
export function useLiveBins() {
  const [bins,    setBins]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const binsRef = useRef([]);   // mutable ref to avoid stale closures

  useEffect(() => {
    let unsubFirestore = null;
    let unsubRTDB      = null;

    // ── Step 1: initial REST fetch ──────────────────────────────────────────
    getAllBins()
      .then((res) => {
        binsRef.current = res.data;
        setBins(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    // ── Step 2: Firestore subscription (full bin document updates) ──────────
    unsubFirestore = subscribeToBins(
      (firestoreBins) => {
        if (!firestoreBins.length) return; // Firestore empty → keep REST data

        // Merge: Firestore doc wins over REST for matching binIds
        setBins((prev) => {
          const fsMap = Object.fromEntries(firestoreBins.map((b) => [b.binId, b]));
          const merged = prev.map((b) => fsMap[b.binId] ? { ...b, ...fsMap[b.binId] } : b);
          // Add any Firestore-only bins not in MongoDB yet
          const prevIds = new Set(prev.map((b) => b.binId));
          firestoreBins.forEach((b) => { if (!prevIds.has(b.binId)) merged.push(b); });
          binsRef.current = merged;
          return merged;
        });
      },
      (err) => console.error('[useLiveBins] Firestore error:', err)
    );

    // ── Step 3: RTDB subscription (ESP32 fill-level micro-updates) ──────────
    unsubRTDB = subscribeToAllSensors((sensors) => {
      // sensors = { "KOP-001": { fill: 87, ts: 1234 }, ... }
      setBins((prev) => {
        const updated = prev.map((bin) => {
          const s = sensors[bin.binId];
          if (!s) return bin;
          const fill   = s.fillPercentage ?? s.fill ?? bin.fillPercentage;
          const status = fill > 80 ? 'Critical' : fill > 50 ? 'Warning' : 'Normal';
          return { ...bin, fillPercentage: fill, status, lastUpdated: new Date().toISOString() };
        });
        binsRef.current = updated;
        return updated;
      });
    });

    return () => {
      unsubFirestore?.();
      unsubRTDB?.();
    };
  }, []); // eslint-disable-line

  return { bins, loading, error };
}
