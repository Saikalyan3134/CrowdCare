require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

const app = express();
app.use(cors());
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL
});

const db = admin.database();
// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// A) Set role claim after registration
app.post('/api/setRoleClaim', async (req, res) => {
  try {
    const { uid, role } = req.body || {};
    if (!uid || !['hospital', 'driver'].includes(role)) {
      return res.status(400).json({ ok: false, error: 'uid and role required' });
    }
    await admin.auth().setCustomUserClaims(uid, { role });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// B) Listen for admissions and increment counters
app.post('/api/admitPatient', async (req, res) => {
  try {
    const { hospitalId, admissionId, type = 'WARD' } = req.body || {};
    if (!hospitalId || !admissionId) {
      return res.status(400).json({ ok: false, error: 'hospitalId and admissionId required' });
    }

    const isICU = String(type || '').toUpperCase() === 'ICU';

    // Increment admitted count
    await db.ref(`hospitals/${hospitalId}/stats/admittedCount`).transaction((v) => (v || 0) + 1);

    // Increment bed/ICU occupied
    const occPath = isICU ? 'icuOccupied' : 'bedsOccupied';
    await db.ref(`hospitals/${hospitalId}/stats/${occPath}`).transaction((v) => (v || 0) + 1);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// C) Listen for discharges and decrement counters
app.post('/api/dischargePatient', async (req, res) => {
  try {
    const { hospitalId, admissionId, type = 'WARD' } = req.body || {};
    if (!hospitalId || !admissionId) {
      return res.status(400).json({ ok: false, error: 'hospitalId and admissionId required' });
    }

    const isICU = String(type || '').toUpperCase() === 'ICU';

    // Decrement admitted count
    await db.ref(`hospitals/${hospitalId}/stats/admittedCount`).transaction((v) => Math.max((v || 0) - 1, 0));

    // Decrement bed/ICU occupied
    const occPath = isICU ? 'icuOccupied' : 'bedsOccupied';
    await db.ref(`hospitals/${hospitalId}/stats/${occPath}`).transaction((v) => Math.max((v || 0) - 1, 0));

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// D) Update prealert status and adjust inflow
app.post('/api/updatePrealertStatus', async (req, res) => {
  try {
    const { hospitalId, alertId, status } = req.body || {};
    if (!hospitalId || !alertId || !status) {
      return res.status(400).json({ ok: false, error: 'hospitalId, alertId, status required' });
    }

    const oldStatus = (await db.ref(`prealerts/${hospitalId}/${alertId}/status`).get()).val() || '';
    const was = String(oldStatus).toLowerCase() === 'en_route';
    const now = String(status).toLowerCase() === 'en_route';
    const delta = (!was && now) ? 1 : (was && !now) ? -1 : 0;

    // Update status
    await db.ref(`prealerts/${hospitalId}/${alertId}`).update({ status });

    // Adjust inflow
    if (delta !== 0) {
      await db.ref(`hospitals/${hospitalId}/stats/inflowActive`).transaction((v) => Math.max((v || 0) + delta, 0));
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// E) Send push notification to hospital
app.post('/api/notifyHospital', async (req, res) => {
  try {
    const { hospitalId, title, body, data } = req.body || {};
    if (!hospitalId) return res.status(400).json({ ok: false, error: 'hospitalId required' });

    const tSnap = await db.ref(`hospitalTokens/${hospitalId}`).get();
    const tokens = tSnap.exists() ? Object.keys(tSnap.val()) : [];

    const message = { notification: { title, body }, data: data || {} };

    if (tokens.length > 0) {
      await admin.messaging().sendEachForMulticast({ tokens, ...message });
    } else {
      await admin.messaging().send({ topic: `hospital_${hospitalId}`, ...message });
    }

    res.json({ ok: true, tokensSent: tokens.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
