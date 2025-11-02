// src/pages/HospitalPrealerts.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, onValue, off, set, update } from "firebase/database";
import { db, auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { HiCheckCircle, HiPhone, HiMapPin, HiClock } from "react-icons/hi2";
import HospitalSidebar from "../components/HospitalSidebar";

// ---- utilities ----
function haversineKm(a, b) {
  if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2) ** 2;
  const s2 = Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s1 + s2));
}
function formatETA(minutes) {
  if (minutes == null) return "—";
  if (minutes < 1) return "< 1 min";
  if (minutes === 1) return "1 min";
  if (minutes < 60) return `${minutes} mins`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
function calculateETA(distanceKm) {
  if (distanceKm == null) return "—";
  const speedKmh = 40;
  const timeHours = distanceKm / speedKmh;
  const timeMinutes = Math.round(timeHours * 60);
  return formatETA(timeMinutes);
}

export default function HospitalPrealerts() {
  const navigate = useNavigate();
  const recalcTimerRef = useRef(null);

  const [uid, setUid] = useState(null);
  const [hospitalLoc, setHospitalLoc] = useState(null);
  const [prealerts, setPrealerts] = useState({});
  const [driverLoc, setDriverLoc] = useState({});
  const [recalcTrigger, setRecalcTrigger] = useState(0);
  const [message, setMessage] = useState("");

  // auth + hospital location
  useEffect(() => {
    const sub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        navigate("/login");
        return;
      }
      setUid(u.uid);
      try {
        const hs = await new Promise((resolve) => {
          const r = ref(db, `hospitals/${u.uid}/location`);
          onValue(r, (snap) => resolve(snap.val()), { onlyOnce: true });
        });
        if (hs && typeof hs.lat === "number" && typeof hs.lng === "number") {
          setHospitalLoc(hs);
        }
      } catch (err) {
        console.error("Error loading location:", err);
      }
    });
    return () => sub();
  }, [navigate]);

  // unified prealerts stream
  useEffect(() => {
    if (!uid) return;
    const r = ref(db, `prealerts/${uid}`);
    const h = onValue(r, (snap) => {
      setPrealerts(snap.val() || {});
      playNotificationSound();
    });
    return () => off(r, "value", h);
  }, [uid]);

  // driver locations stream for drivers found in alerts
  useEffect(() => {
    const subs = [];
    const ids = Array.from(
      new Set(
        Object.entries(prealerts)
          .map(([key, p]) => (p?.driverId ? p.driverId : null))
          .filter(Boolean)
      )
    );
    ids.forEach((dId) => {
      const r = ref(db, `driverLocations/${dId}`);
      const h = onValue(r, (snap) => {
        setDriverLoc((s) => ({ ...s, [dId]: snap.val() || null }));
      });
      subs.push({ r, h });
    });
    return () => subs.forEach(({ r, h }) => off(r, "value", h));
  }, [prealerts]);

  // periodic recalc
  useEffect(() => {
    recalcTimerRef.current = setInterval(() => setRecalcTrigger((x) => x + 1), 30000);
    return () => {
      if (recalcTimerRef.current) clearInterval(recalcTimerRef.current);
    };
  }, []);

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch {
      // ignore
    }
  };

  // compute Active vs Completed (arrived/declined -> Completed)
  const { activeAlerts, completedAlerts, incomingCount } = useMemo(() => {
    if (!hospitalLoc) return { activeAlerts: [], completedAlerts: [], incomingCount: 0 };

    const list = Object.entries(prealerts).map(([key, p]) => ({ ...p, alertId: key }));
    const active = [];
    const completed = [];
    let incoming = 0;

    list.forEach((p) => {
      if (!p) return;

      let distanceKm = null;
      if (p.type === "crowd" && p.userLocation) {
        distanceKm = haversineKm(p.userLocation, hospitalLoc);
      } else if (p.driverId && driverLoc[p.driverId]) {
        distanceKm = haversineKm(driverLoc[p.driverId], hospitalLoc);
      }
      const eta = calculateETA(distanceKm);
      const alert = { ...p, distanceKm, eta };

      // Completed list: arrived or declined
      if (p.status === "arrived" || p.status === "declined") {
        completed.push(alert);
        return;
      }

      // Active list: pending/en_route/no status
      if (p.status === "pending" || p.status === "en_route" || !p.status) {
        active.push(alert);
        incoming++;
        return;
      }

      // Any other status -> treat as active (optional)
      active.push(alert);
    });

    active.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    completed.sort(
      (a, b) => (b.arrivedAt || b.declinedAt || 0) - (a.arrivedAt || a.declinedAt || 0)
    );

    return { activeAlerts: active, completedAlerts: completed, incomingCount: incoming };
  }, [prealerts, driverLoc, hospitalLoc, recalcTrigger]);

  // sync inflowActive with number of active alerts
  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        await set(ref(db, `hospitals/${uid}/stats/inflowActive`), activeAlerts.length);
      } catch (e) {
        console.error("Error syncing inflowActive", e);
      }
    })();
  }, [uid, activeAlerts.length]);

  // actions
  const markArrived = async (alertId) => {
    if (!uid) {
      setMessage("❌ Hospital ID not found");
      return;
    }
    try {
      await update(ref(db, `prealerts/${uid}/${alertId}`), {
        status: "arrived",
        arrivedAt: Date.now(),
      });
      setMessage("✅ Marked as arrived! Inflow updated.");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("❌ Error: " + err.message);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const declineAlert = async (alertId) => {
    if (!uid) return;
    try {
      await update(ref(db, `prealerts/${uid}/${alertId}`), {
        status: "declined",
        declinedAt: Date.now(),
      });
      setMessage("⛔ Alert declined");
      setTimeout(() => setMessage(""), 3000);
    } catch (e) {
      setMessage("❌ Error: " + e.message);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const stats = {
    total: Object.keys(prealerts).length,
    active: activeAlerts.length,
    completed: completedAlerts.length,
    incoming: incomingCount,
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-cyan-100 to-teal-100 dark:from-blue-950 dark:via-cyan-900 dark:to-teal-950">
      <div className="flex">
        <HospitalSidebar />
        <main className="flex-1 min-w-0">
          {/* Top bar */}
          <div className="h-16 sticky top-0 z-20 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border-b border-white/10">
            <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
              <h1 className="text-xl md:text-2xl font-extrabold text-cyan-800 dark:text-cyan-100">
                Pre‑Alerts
              </h1>
              <div className="text-cyan-900/80 dark:text-cyan-100/80 text-sm font-semibold flex gap-4">
                <span>
                  🚨 Incoming:{" "}
                  <span className="text-red-600 font-bold">{stats.incoming}</span>
                </span>
                <span>Active: {stats.active}</span>
                <span>Completed: {stats.completed}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
            {/* Toast */}
            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-3 rounded-lg text-center font-semibold ${
                    message.includes("✅")
                      ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                      : message.includes("⛔")
                      ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                      : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                  }`}
                >
                  {message}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ACTIVE ALERTS */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-8 bg-gradient-to-b from-red-500 to-orange-500 rounded-full"></div>
                <h2 className="text-2xl font-bold text-cyan-800 dark:text-cyan-100">
                  🚑 Active Alerts (auto‑updates every 30s)
                </h2>
                <span className="ml-auto px-3 py-1 bg-red-600 text-white rounded-full text-sm font-bold">
                  {activeAlerts.length}
                </span>
              </div>

              {activeAlerts.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  <AnimatePresence mode="popLayout">
                    {activeAlerts.map((alert, idx) => {
                      const isCrowd = alert.type === "crowd";
                      const distanceMeters = alert.distanceKm ? alert.distanceKm * 1000 : null;

                      return (
                        <motion.div
                          key={alert.alertId}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: idx * 0.06 }}
                          className="rounded-2xl p-6 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 ring-2 ring-red-300 dark:ring-red-700 hover:shadow-xl transition-shadow"
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <p className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase tracking-wide">
                                {isCrowd ? "Crowd Alert" : "En Route"}
                              </p>
                              <h3 className="text-xl font-bold text-red-900 dark:text-red-100 mt-1">
                                {isCrowd ? "Crowd Emergency" : alert.ambulanceType || "Ambulance"}
                              </h3>
                            </div>
                            <div className="px-3 py-1 bg-red-600 text-white rounded-full">
                              <span className="inline-block w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
                              Live
                            </div>
                          </div>

                          {/* Info */}
                          <div className="bg-white/60 dark:bg-zinc-800/60 p-3 rounded-lg mb-4 space-y-2">
                            {isCrowd ? (
                              <>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  <span className="font-semibold">Contact:</span>{" "}
                                  {alert.contactNumber || "—"}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  <span className="font-semibold">Driver:</span>{" "}
                                  {alert.driverName || alert.driverId || "—"}
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  <span className="font-semibold">Ambulance #:</span>{" "}
                                  {alert.ambulanceNumber || "—"}
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  <span className="font-semibold">Phone:</span>{" "}
                                  <a
                                    href={`tel:${alert.driverPhone || ""}`}
                                    className="text-blue-600 hover:underline"
                                  >
                                    {alert.driverPhone || "—"}
                                  </a>
                                </p>
                              </>
                            )}
                          </div>

                          {/* Distance & ETA */}
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/50 dark:to-cyan-900/50 p-4 rounded-lg">
                              <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold mb-1">
                                <HiMapPin className="inline w-4 h-4 mr-1" />
                                Distance (Live)
                              </p>
                              {alert.distanceKm !== null ? (
                                <>
                                  <p className="text-3xl font-extrabold text-blue-900 dark:text-blue-100">
                                    {alert.distanceKm < 1
                                      ? distanceMeters?.toFixed(0)
                                      : alert.distanceKm.toFixed(1)}
                                  </p>
                                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                    {alert.distanceKm < 1
                                      ? `${distanceMeters?.toFixed(0) || 0} meters`
                                      : `${alert.distanceKm.toFixed(2)} km`}
                                  </p>
                                </>
                              ) : (
                                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                  Locating...
                                </p>
                              )}
                            </div>

                            <div className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 p-4 rounded-lg">
                              <p className="text-xs text-purple-700 dark:text-purple-300 font-semibold mb-1">
                                <HiClock className="inline w-4 h-4 mr-1" />
                                Estimated Time
                              </p>
                              <p className="text-3xl font-extrabold text-purple-900 dark:text-purple-100">
                                {alert.eta}
                              </p>
                              {!isCrowd && alert.distanceKm !== null && alert.distanceKm <= 0.5 && (
                                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                                  ✅ Almost here!
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          {isCrowd ? (
                            <div className="grid grid-cols-3 gap-3">
                              {/* Arrived for crowd (always enabled) */}
                              <button
                                onClick={() => markArrived(alert.alertId)}
                                className="px-4 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold"
                                title="Mark as arrived"
                              >
                                Arrived
                              </button>
                              <button
                                onClick={() => declineAlert(alert.alertId)}
                                className="px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
                              >
                                Decline (Fake)
                              </button>
                              <button
                                onClick={() =>
                                  alert.contactNumber && window.open(`tel:${alert.contactNumber}`)
                                }
                                className="px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2"
                                title="Call Crowd"
                              >
                                <HiPhone className="w-5 h-5" />
                                Call Crowd
                              </button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={() => markArrived(alert.alertId)}
                                disabled={!(alert.distanceKm != null && alert.distanceKm <= 0.5)}
                                className={`px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                                  alert.distanceKm != null && alert.distanceKm <= 0.5
                                    ? "bg-green-600 hover:bg-green-700 text-white shadow-lg"
                                    : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                }`}
                                title={
                                  alert.distanceKm != null && alert.distanceKm <= 0.5
                                    ? "Mark as arrived"
                                    : "Distance must be < 500m"
                                }
                              >
                                <HiCheckCircle className="w-5 h-5" />
                                Arrived
                              </button>
                              <button
                                onClick={() =>
                                  alert.driverPhone && window.open(`tel:${alert.driverPhone}`)
                                }
                                className="px-4 py-3 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center justify-center gap-2 shadow-lg"
                              >
                                <HiPhone className="w-5 h-5" />
                                Call Driver
                              </button>
                            </div>
                          )}

                          {/* Distance note for drivers */}
                          {!isCrowd &&
                            !(alert.distanceKm != null && alert.distanceKm <= 0.5) &&
                            alert.distanceKm !== null && (
                              <p className="text-xs text-orange-700 dark:text-orange-300 mt-3 text-center">
                                ⚠️ Ambulance is{" "}
                                {alert.distanceKm < 1
                                  ? `${distanceMeters?.toFixed(0)}m`
                                  : `${alert.distanceKm.toFixed(2)}km`}{" "}
                                away.
                              </p>
                            )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 rounded-2xl bg-white/50 dark:bg-zinc-800/50"
                >
                  <p className="text-cyan-900/80 dark:text-cyan-100/80 text-lg font-semibold">
                    No active pre‑alerts
                  </p>
                </motion.div>
              )}
            </section>

            {/* COMPLETED SECTION */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-8 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
                <h2 className="text-2xl font-bold text-cyan-800 dark:text-cyan-100">✓ Completed</h2>
                <span className="ml-auto px-3 py-1 bg-green-600 text-white rounded-full text-sm font-bold">
                  {completedAlerts.length}
                </span>
              </div>

              {completedAlerts.length > 0 ? (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {completedAlerts.map((alert, idx) => (
                      <motion.div
                        key={alert.alertId}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: idx * 0.05 }}
                        className="rounded-xl p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 ring-1 ring-green-300 dark:ring-green-700 hover:shadow-lg transition-shadow"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                          <div>
                            <p className="text-xs text-green-700 dark:text-green-300 font-semibold uppercase">
                              Type
                            </p>
                            <p className="text-lg font-bold text-green-900 dark:text-green-100">
                              {alert.type === "crowd" ? "Crowd" : alert.ambulanceType || "Ambulance"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-green-700 dark:text-green-300 font-semibold uppercase">
                              Name / Contact
                            </p>
                            <p className="text-lg font-bold text-green-900 dark:text-green-100">
                              {alert.type === "crowd"
                                ? alert.contactNumber || "—"
                                : alert.driverName || alert.driverId || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-green-700 dark:text-green-300 font-semibold uppercase">
                              Updated At
                            </p>
                            <p className="text-lg font-bold text-green-900 dark:text-green-100">
                              {alert.arrivedAt
                                ? new Date(alert.arrivedAt).toLocaleTimeString()
                                : alert.declinedAt
                                ? new Date(alert.declinedAt).toLocaleTimeString()
                                : "—"}
                            </p>
                          </div>
                          <div className="flex items-center justify-end">
                            {alert.status === "arrived" ? (
                              <div className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold">
                                <HiCheckCircle className="w-5 h-5" />
                                Completed
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold">
                                Declined
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 rounded-2xl bg-white/50 dark:bg-zinc-800/50"
                >
                  <p className="text-cyan-900/80 dark:text-cyan-100/80 text-lg font-semibold">
                    No completed pre‑alerts yet
                  </p>
                </motion.div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
