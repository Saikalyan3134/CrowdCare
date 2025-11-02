// src/pages/HospitalDashboard.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import HospitalSidebar from "../components/HospitalSidebar";
import { ref, onValue, off, update, get } from "firebase/database";
import { db, auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { HiXMark } from "react-icons/hi2";

function haversineKm(a, b) {
  if (!a || !b || a.lat === undefined || a.lng === undefined || b.lat === undefined || b.lng === undefined) {
    return null;
  }
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2) ** 2;
  const s2 = Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s1 + s2));
}

export default function HospitalDashboard() {
  const navigate = useNavigate();

  const [uid, setUid] = useState(null);
  const [hospitalLoc, setHospitalLoc] = useState(null);
  const [capacity, setCapacity] = useState({ bedsTotal: 0, icuTotal: 0 });
  const [stats, setStats] = useState({
    bedsOccupied: 0,
    icuOccupied: 0,
    admittedCount: 0,
    inflowActive: 0,
  });
  const [prealerts, setPrealerts] = useState({});
  const [driverLoc, setDriverLoc] = useState({});

  // Location Modal States (unchanged)
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoMessage, setGeoMessage] = useState("");
  const [tempLat, setTempLat] = useState(0);
  const [tempLng, setTempLng] = useState(0);

  // Get auth user and hospital location
  useEffect(() => {
    const sub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      setUid(u.uid);
      try {
        const hs = await get(ref(db, `hospitals/${u.uid}/location`));
        if (hs.exists()) {
          const locData = hs.val();
          if (locData && typeof locData.lat === "number" && typeof locData.lng === "number") {
            setHospitalLoc(locData);
          }
        }
      } catch (err) {
        console.error("Error loading hospital location:", err);
      }
    });
    return () => sub();
  }, []);

  // Subscribe to capacity
  useEffect(() => {
    if (!uid) return;
    const r = ref(db, `hospitals/${uid}/capacity`);
    const h = onValue(r, (snap) => {
      const data = snap.val();
      if (data && typeof data.bedsTotal === "number" && typeof data.icuTotal === "number") {
        setCapacity(data);
      } else {
        setCapacity({ bedsTotal: 0, icuTotal: 0 });
      }
    });
    return () => off(r, "value", h);
  }, [uid]);

  // Subscribe to stats
  useEffect(() => {
    if (!uid) return;
    const r = ref(db, `hospitals/${uid}/stats`);
    const h = onValue(r, (snap) => {
      const data = snap.val();
      setStats(
        data || {
          bedsOccupied: 0,
          icuOccupied: 0,
          admittedCount: 0,
          inflowActive: 0,
        }
      );
    });
    return () => off(r, "value", h);
  }, [uid]);

  // Subscribe to prealerts (realtime)
  useEffect(() => {
    if (!uid) return;
    const r = ref(db, `prealerts/${uid}`);
    const h = onValue(r, (snap) => setPrealerts(snap.val() || {}));
    return () => off(r, "value", h);
  }, [uid]);

  // Subscribe to driver locations only for active alerts (pending/en_route/no status)
  useEffect(() => {
    if (!uid) return;
    const active = Object.entries(prealerts)
      .map(([alertId, p]) => ({ alertId, ...p }))
      .filter((p) => p && (p.status === "pending" || p.status === "en_route" || !p.status));

    const driverIds = Array.from(new Set(active.map((p) => p.driverId).filter(Boolean)));
    const subs = driverIds.map((dId) => {
      const r = ref(db, `driverLocations/${dId}`);
      const h = onValue(r, (snap) => {
        setDriverLoc((prev) => ({ ...prev, [dId]: snap.val() || null }));
      });
      return { r, h };
    });
    return () => subs.forEach(({ r, h }) => off(r, "value", h));
  }, [uid, prealerts]);

  // Get location with GPS (unchanged)
  const handleGetLocation = async () => {
    setGeoLoading(true);
    setGeoMessage("");
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          try {
            const { latitude: lat, longitude: lng } = pos.coords;
            setTempLat(parseFloat(lat.toFixed(6)));
            setTempLng(parseFloat(lng.toFixed(6)));
            setGeoMessage(`✅ Location detected: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          } catch (err) {
            setGeoMessage("❌ Error processing location");
          } finally {
            setGeoLoading(false);
          }
        },
        (err) => {
          setGeoMessage("❌ " + err.message);
          setGeoLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGeoMessage("❌ Geolocation not supported");
      setGeoLoading(false);
    }
  };

  // Save location (unchanged)
  const handleSaveLocation = async () => {
    if (!uid || !tempLat || !tempLng) {
      setGeoMessage("❌ Please get location first");
      return;
    }
    setGeoLoading(true);
    try {
      await update(ref(db, `hospitals/${uid}`), {
        location: {
          address: hospitalLoc?.address || "",
          lat: tempLat,
          lng: tempLng,
        },
        updatedAt: Date.now(),
      });
      setHospitalLoc({ lat: tempLat, lng: tempLng, address: hospitalLoc?.address || "" });
      setGeoMessage("✅ Location saved successfully!");
      setTimeout(() => setShowLocationModal(false), 2000);
    } catch (err) {
      setGeoMessage("❌ Error: " + err.message);
    } finally {
      setGeoLoading(false);
    }
  };

  // KPIs (keep)
  const kpis = useMemo(
    () => ({
      bedsAvail: Math.max((capacity.bedsTotal || 0) - (stats.bedsOccupied || 0), 0),
      icuAvail: Math.max((capacity.icuTotal || 0) - (stats.icuOccupied || 0), 0),
      admitted: stats.admittedCount || 0,
      inflow: stats.inflowActive || 0,
    }),
    [capacity, stats]
  );

  // Active Pre‑Alerts overview list (no buttons; clicking row navigates to Pre‑Alerts)
  const activeList = useMemo(() => {
    const list = Object.entries(prealerts).map(([alertId, p]) => ({ alertId, ...p }));
    const active = list.filter(
      (p) => p && (p.status === "pending" || p.status === "en_route" || !p.status)
    );

    // Attach a distance label using driver or crowd location
    if (hospitalLoc) {
      active.forEach((p) => {
        let km = null;
        if (p.type === "crowd" && p.userLocation) {
          km = haversineKm(hospitalLoc, p.userLocation);
        } else if (p.driverId && driverLoc[p.driverId]) {
          km = haversineKm(hospitalLoc, driverLoc[p.driverId]);
        }
        p.distanceLabel =
          km == null ? "—" : km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(2)} km`;
      });
    }

    // Sort by numeric distance if available
    active.sort((a, b) => {
      const parseDist = (x) =>
        typeof x === "string"
          ? x.endsWith("km")
            ? parseFloat(x)
            : x.endsWith("m")
            ? parseFloat(x) / 1000
            : Infinity
          : Infinity;
      return parseDist(a.distanceLabel) - parseDist(b.distanceLabel);
    });

    return active;
  }, [prealerts, driverLoc, hospitalLoc]);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-cyan-200 to-teal-100 dark:from-blue-950 dark:via-cyan-900 dark:to-teal-950">
      <div className="flex">
        <HospitalSidebar />
        <main className="flex-1 min-w-0">
          {/* Top bar */}
          <div className="h-16 sticky top-0 z-20 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border-b border-white/10 dark:border-white/10">
            <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
              <h1 className="text-xl md:text-2xl font-extrabold text-cyan-800 dark:text-cyan-100">
                Hospital Dashboard
              </h1>

              {/* Compact counters in top bar */}
              <div className="text-cyan-900/80 dark:text-cyan-100/80 text-sm font-semibold flex gap-4">
                <span>Beds: {kpis.bedsAvail}/{capacity.bedsTotal || 0}</span>
                <span>ICU: {kpis.icuAvail}/{capacity.icuTotal || 0}</span>
                <span>Admitted: {kpis.admitted}</span>
                <span>Inflow: {kpis.inflow}</span>
              </div>
            </div>
          </div>

          {/* Location Modal (unchanged) */}
          <AnimatePresence>
            {showLocationModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                onClick={() => setShowLocationModal(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-sm w-full p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-cyan-800 dark:text-cyan-100">
                      Set Hospital Location
                    </h3>
                    <button
                      onClick={() => setShowLocationModal(false)}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                    >
                      <HiXMark className="w-6 h-6" />
                    </button>
                  </div>

                  {tempLat && tempLng && (
                    <div className="mb-4 p-3 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg border border-cyan-200 dark:border-cyan-700">
                      <p className="text-sm text-cyan-800 dark:text-cyan-200">
                        <span className="font-bold">Latitude:</span> {tempLat.toFixed(6)}
                      </p>
                      <p className="text-sm text-cyan-800 dark:text-cyan-200">
                        <span className="font-bold">Longitude:</span> {tempLng.toFixed(6)}
                      </p>
                    </div>
                  )}

                  {geoMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mb-4 p-3 rounded-lg text-sm font-semibold text-center ${
                        geoMessage.includes("✅")
                          ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                          : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                      }`}
                    >
                      {geoMessage}
                    </motion.div>
                  )}

                  <div className="space-y-3">
                    <button
                      onClick={handleGetLocation}
                      disabled={geoLoading}
                      className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-all"
                    >
                      {geoLoading ? "Getting Location..." : "📍 Get My Location"}
                    </button>

                    <button
                      onClick={handleSaveLocation}
                      disabled={!tempLat || !tempLng || geoLoading}
                      className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-all"
                    >
                      ✅ Save Location
                    </button>

                    <button
                      onClick={() => setShowLocationModal(false)}
                      className="w-full px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* KPI Tiles (kept) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Beds available", value: kpis.bedsAvail },
                { label: "ICU available", value: kpis.icuAvail },
                { label: "Patients admitted", value: kpis.admitted },
                { label: "Patient inflow", value: kpis.inflow },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-2xl p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md ring-1 ring-cyan-100 dark:ring-cyan-900 shadow-lg"
                >
                  <p className="text-sm text-cyan-800/80 dark:text-cyan-200/80">{stat.label}</p>
                  <p className="text-2xl font-extrabold text-cyan-700 dark:text-cyan-100">{stat.value}</p>
                </motion.div>
              ))}
            </div>

            {/* New Pre‑Alerts overview list (active only; no buttons; click to open Pre‑Alerts) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-cyan-700 dark:text-cyan-300">
                  Active Pre‑Alerts
                </h2>
                <span className="px-3 py-1 bg-red-600 text-white rounded-full text-sm font-bold">
                  {activeList.length}
                </span>
              </div>

              <div className="rounded-2xl overflow-hidden bg-white/80 dark:bg-zinc-900/80 ring-1 ring-cyan-100 dark:ring-cyan-900">
                <div className="divide-y divide-cyan-100 dark:divide-cyan-900">
                  {activeList.length > 0 ? (
                    activeList.map((a) => {
                      const isCrowd = a.type === "crowd";
                      return (
                        <button
                          key={a.alertId}
                          onClick={() => navigate("/prealerts")}
                          className="w-full text-left px-4 py-3 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition flex items-center justify-between"
                          title="Open Pre‑Alerts"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-xs px-2 py-1 rounded font-semibold ${
                                isCrowd
                                  ? "bg-rose-600/20 text-rose-800 dark:text-rose-100"
                                  : "bg-cyan-600/20 text-cyan-900 dark:text-cyan-100"
                              }`}
                            >
                              {isCrowd ? "CROWD" : "DRIVER"}
                            </span>
                            <div className="text-sm">
                              <div className="font-semibold text-cyan-900 dark:text-cyan-100">
                                {isCrowd
                                  ? a.contactNumber || "Crowd Emergency"
                                  : a.driverName || a.driverId || "Ambulance"}
                              </div>
                              <div className="text-cyan-800/80 dark:text-cyan-200/80">
                                {isCrowd ? "Emergency reported by the public" : a.ambulanceType || "Ambulance"}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-cyan-900 dark:text-cyan-100">
                              {a.distanceLabel || "—"}
                            </div>
                            <div className="text-xs text-cyan-800/70 dark:text-cyan-200/70">
                              {a.status || "pending"}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-4 py-8 text-center text-cyan-900/80 dark:text-cyan-100/80">
                      No active pre‑alerts
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-cyan-800/70 dark:text-cyan-200/70 mt-2">
                This list updates in real‑time and only shows pending or en‑route alerts; once marked
                arrived or declined in Pre‑Alerts, they disappear here automatically. Click any row to open
                the Pre‑Alerts page for full actions and details.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
