import { useEffect, useState, useRef } from 'react';
import { subscribeToBins, subscribeToAllSensors } from '../services/firebase';
import { getAllBins } from '../services/binService';

/**
 * useLiveBins
 * ─────────────────────────────────────────────────────────────
 * Returns live bin data merged from three sources:
 *
 *  1. MongoDB REST API       — fast first paint, source of truth
 *  2. Firebase Firestore     — structural bin document updates
 *  3. Firebase RTDB /bins/*  — ESP32 sensor patches (fill level)
 *
 * RTDB schema (your actual structure):
 *   /bins/BIN001
 *     binHeightCm:  241.8
 *     distanceCm:   245.8
 *     fillPercent:  0          ← field sent by ESP32
 *     updatedAt:    1792319335  ← Unix seconds
 *
 * MongoDB schema uses binId like "KOP-001", "SHR-001".
 * RTDB uses "BIN001". We match by stripping non-alpha chars:
 *   "KOP-001" → "KOP001", "BIN001" → "BIN001"
 * (adjust the normaliseBinId fn below if your naming differs)
 */

/** Strip hyphens for loose matching between RTDB and MongoDB IDs */
function normaliseBinId(id = '') {
  return id.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

export function useLiveBins() {
  const [bins,    setBins]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const binsRef = useRef([]);

  useEffect(() => {
    let unsubFirestore = null;
    let unsubRTDB      = null;

    // ── STEP 1: Initial REST fetch (MongoDB) ──────────────────────────────
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

    // ── STEP 2: Firestore onSnapshot — structural updates ─────────────────
    unsubFirestore = subscribeToBins(
      (firestoreBins) => {
        if (!firestoreBins.length) return;
        setBins((prev) => {
          const fsMap = Object.fromEntries(firestoreBins.map((b) => [b.binId, b]));
          const merged = prev.map((b) =>
            fsMap[b.binId] ? { ...b, ...fsMap[b.binId] } : b
          );
          const prevIds = new Set(prev.map((b) => b.binId));
          firestoreBins.forEach((b) => {
            if (!prevIds.has(b.binId)) merged.push(b);
          });
          binsRef.current = merged;
          return [...merged];
        });
      },
      (err) => console.warn('[useLiveBins] Firestore:', err.message)
    );

    // ── STEP 3: RTDB onValue — ESP32 fill-level patches ──────────────────
    // Your RTDB: /bins/BIN001 { fillPercent, distanceCm, binHeightCm, updatedAt }
    unsubRTDB = subscribeToAllSensors((rtdbBins) => {
      // rtdbBins already normalised by firebase.js:
      // { BIN001: { fillPercentage: 5, lastUpdated: "...", ... }, ... }

      setBins((prev) => {
        // Patch existing MongoDB bins with RTDB sensor data
        const matchedRtdbKeys = new Set();

        const updated = prev.map((bin) => {
          // Try exact match first, then normalised match
          const rtdbKey =
            Object.keys(rtdbBins).find(
              (k) => k === bin.binId ||
                     normaliseBinId(k) === normaliseBinId(bin.binId)
            );
          if (!rtdbKey) return bin;

          matchedRtdbKeys.add(rtdbKey);

          const sensor = rtdbBins[rtdbKey];
          const fill   = sensor.fillPercentage ?? bin.fillPercentage;
          const status =
            fill > 80 ? 'Critical' :
            fill > 50 ? 'Warning'  : 'Normal';

          return {
            ...bin,
            fillPercentage: fill,
            status,
            lastUpdated:    sensor.lastUpdated ?? new Date().toISOString(),
            // Extra sensor fields shown in UI where useful
            _sensor: {
              distanceCm:  sensor.distanceCm,
              binHeightCm: sensor.binHeightCm,
              rawFillPct:  sensor.fillPercent,
            },
          };
        });

        // ── Add RTDB-only bins (e.g. BIN001) that have no MongoDB record ──
        // These are real ESP32 bins not yet registered in MongoDB.
        Object.entries(rtdbBins).forEach(([rtdbKey, sensor]) => {
          if (matchedRtdbKeys.has(rtdbKey)) return; // already merged above

          const fill   = sensor.fillPercentage ?? 0;
          const status =
            fill > 80 ? 'Critical' :
            fill > 50 ? 'Warning'  : 'Normal';

          updated.push({
            binId:          rtdbKey,
            fillPercentage: fill,
            status,
            lastUpdated:    sensor.lastUpdated ?? new Date().toISOString(),
            location:       null,   // no MongoDB record → no lat/lng yet
            _rtdbOnly:      true,   // flag so UI can show "No location"
            _sensor: {
              distanceCm:  sensor.distanceCm,
              binHeightCm: sensor.binHeightCm,
              rawFillPct:  sensor.fillPercent,
            },
          });
        });

        binsRef.current = updated;
        return [...updated];
      });
    });

    return () => {
      unsubFirestore?.();
      unsubRTDB?.();
    };
  }, []); // eslint-disable-line

  return { bins, loading, error };
}
