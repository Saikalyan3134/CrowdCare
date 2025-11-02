// functions/index.js  (CommonJS)
const { onValueCreated } = require("firebase-functions/database");
const { onRequest } = require("firebase-functions/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.database();

// Set role claim after registration
exports.setRoleClaim = onRequest(async (req, res) => {
  // protect with auth/secret in production
  const { uid, role } = req.body || {};
  if (!uid || !['hospital','driver'].includes(role)) return res.status(400).json({ ok:false });
  await admin.auth().setCustomUserClaims(uid, { role }); // refresh token on client after this [web:209][web:596]
  res.json({ ok: true });
});

// Notify hospital when a prealert is created
exports.onPrealertCreate = onValueCreated(
  { ref: "prealerts/{hospitalId}/{alertId}" },
  async (event) => {
    const { hospitalId, alertId } = event.params;
    const alert = event.data.val() || {};
    const { driverId = "", ambulanceType = "Unknown" } = alert;

    const tokensSnap = await db.ref(`hospitalTokens/${hospitalId}`).get();
    const tokens = tokensSnap.exists() ? Object.keys(tokensSnap.val()) : [];

    const message = {
      notification: { title: "Incoming Pre‑Alert", body: `Ambulance (${ambulanceType}) is en route` },
      data: { hospitalId, alertId, driverId, ambulanceType },
    };

    if (tokens.length > 0) {
      await admin.messaging().sendEachForMulticast({ tokens, ...message }); // supported in Admin SDK [web:606]
    } else {
      await admin.messaging().send({ topic: `hospital_${hospitalId}`, ...message }); // topic fallback [web:321]
    }
    return null;
  }
);
