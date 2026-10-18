const admin = require('firebase-admin');

let db   = null;   // Firestore
let rtdb = null;   // Realtime Database

/**
 * Initialize Firebase Admin SDK.
 * Requires FIREBASE_PROJECT_ID and FIREBASE_DATABASE_URL in .env.
 * Service account credentials can be provided as:
 *   - FIREBASE_SERVICE_ACCOUNT_JSON env var (JSON string)
 *   - Or falls back to Application Default Credentials (for cloud hosting)
 */
function initFirebase() {
  if (admin.apps.length) {
    // Already initialized — reuse
    db   = admin.firestore();
    rtdb = admin.database();
    return;
  }

  try {
    let credential;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      // Parse the JSON string from env
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      credential = admin.credential.cert(serviceAccount);
    } else {
      // Use Application Default Credentials (when deployed to Google Cloud)
      credential = admin.credential.applicationDefault();
    }

    admin.initializeApp({
      credential,
      databaseURL:  process.env.FIREBASE_DATABASE_URL,
      projectId:    process.env.FIREBASE_PROJECT_ID,
    });

    db   = admin.firestore();
    rtdb = admin.database();

    console.log('✅  Firebase Admin SDK initialized');
  } catch (err) {
    // Firebase is optional — app still works with just MongoDB
    console.warn('⚠️   Firebase Admin init skipped:', err.message);
  }
}

/**
 * Sync a bin document to Firestore (called after every MongoDB update).
 * Fire-and-forget — does not block the HTTP response.
 */
async function syncBinToFirestore(bin) {
  if (!db) return;
  try {
    await db.collection('bins').doc(bin.binId).set(
      {
        binId:          bin.binId,
        fillPercentage: bin.fillPercentage,
        status:         bin.status,
        location:       { lat: bin.location.lat, lng: bin.location.lng },
        lastUpdated:    admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('[Firebase] syncBinToFirestore error:', err.message);
  }
}

/**
 * Sync a bin's fill level to Realtime Database.
 * ESP32 devices can also write here directly.
 * Path: /sensors/<binId>
 */
async function syncSensorToRTDB(bin) {
  if (!rtdb) return;
  try {
    await rtdb.ref(`sensors/${bin.binId}`).set({
      binId:          bin.binId,
      fillPercentage: bin.fillPercentage,
      status:         bin.status,
      ts:             Date.now(),
    });
  } catch (err) {
    console.error('[Firebase] syncSensorToRTDB error:', err.message);
  }
}

module.exports = { initFirebase, syncBinToFirestore, syncSensorToRTDB };
