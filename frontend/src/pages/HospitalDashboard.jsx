import React, { useEffect, useState, useMemo } from "react";
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
  
  // Location Modal States
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

  // Subscribe to prealerts
  useEffect(() => {
    if (!uid) return;
    const r = ref(db, `prealerts/${uid}`);
    const h = onValue(r, (snap) => setPrealerts(snap.val() || {}));
    return () => off(r, "value", h);
  }, [uid]);
  // Get location with GPS
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

  // Save location to database
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

  // Compute KPIs
  const kpis = useMemo(
    () => ({
      bedsAvail: Math.max((capacity.bedsTotal || 0) - (stats.bedsOccupied || 0), 0),
      icuAvail: Math.max((capacity.icuTotal || 0) - (stats.icuOccupied || 0), 0),
      admitted: stats.admittedCount || 0,
      inflow: stats.inflowActive || 0,
    }),
    [capacity, stats]
  );

  // Map prealerts to cards with distance
  const cards = useMemo(() => {
    if (!hospitalLoc) return [];
    return Object.entries(prealerts)
      .map(([alertId, p]) => {
        if (!p) return null;
        const d = driverLoc[p.driverId];
        let distanceKm = null;
        if (d && d.lat !== undefined && d.lng !== undefined) {
          const km = haversineKm(hospitalLoc, d);
          distanceKm = km ? km.toFixed(2) : null;
        }
        return { alertId, ...p, distanceKm };
      })
      .filter(Boolean);
  }, [prealerts, driverLoc, hospitalLoc]);

  // Update prealert status
  const setStatus = async (alertId, status) => {
    if (!uid) return;
    try {
      await update(ref(db, `prealerts/${uid}/${alertId}`), { status });
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

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

              {/* Location Display/Set Button */}
              <div className="flex items-center gap-3">
                {hospitalLoc &&
                hospitalLoc.lat !== undefined &&
                hospitalLoc.lng !== undefined &&
                hospitalLoc.lat !== 0 &&
                hospitalLoc.lng !== 0 ? (
                  // Show Location Badge
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => setShowLocationModal(true)}
                  >
                    <span className="text-sm font-bold text-white">
                      📍 {hospitalLoc.lat.toFixed(3)}, {hospitalLoc.lng.toFixed(3)}
                    </span>
                  </motion.div>
                ) : (
                  // Show SET Button
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setShowLocationModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-lg shadow-lg transition-all cursor-pointer"
                  >
                    <span>📍</span>
                    <span>SET Location</span>
                  </motion.button>
                )}
              </div>
            </div>
          </div>

          {/* Location Modal */}
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

                  {/* Location Display */}
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

                  {/* Message */}
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

                  {/* Buttons */}
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
            {/* KPI Cards */}
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
                  <p className="text-2xl font-extrabold text-cyan-700 dark:text-cyan-100">
                    {stat.value}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Pre-Alerts Section */}
            <div>
              <h2 className="text-lg font-bold text-cyan-700 dark:text-cyan-300 mb-4">
                Pre‑Alerts ({cards.length})
              </h2>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {cards.map((c) => (
                  <motion.div
                    key={c.alertId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md ring-1 ring-cyan-100 dark:ring-cyan-900"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-cyan-800 dark:text-cyan-100">
                        Incoming Pre‑Alert
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded font-semibold ${
                          c.status === "accepted"
                            ? "bg-green-600/20 text-green-900 dark:text-green-100"
                            : c.status === "declined"
                            ? "bg-red-600/20 text-red-900 dark:text-red-100"
                            : "bg-cyan-600/20 text-cyan-900 dark:text-cyan-100"
                        }`}
                      >
                        {c.status ?? "pending"}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-cyan-900/90 dark:text-cyan-100/90 space-y-1">
                      <div>Driver: {c.driverId || "—"}</div>
                      <div>Ambulance: {c.ambulanceType || "Unknown"}</div>
                      <div>Distance: {c.distanceKm ? `${c.distanceKm} km` : "—"}</div>
                      {c.eta && <div>ETA: {c.eta}</div>}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => setStatus(c.alertId, "accepted")}
                        className="flex-1 px-3 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => setStatus(c.alertId, "declined")}
                        className="flex-1 px-3 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition"
                      >
                        Decline
                      </button>
                    </div>
                  </motion.div>
                ))}
                {cards.length === 0 && (
                  <div className="col-span-full text-center text-cyan-900/80 dark:text-cyan-100/80 py-12">
                    No pre‑alerts yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
