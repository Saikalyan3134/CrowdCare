import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { ref, onValue, off, set } from "firebase/database";
import { db, auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { HiMapPin, HiArrowLeftOnRectangle, HiCheckCircle, HiXMark, HiArrowTopRightOnSquare } from "react-icons/hi2";
import { getTopRecommendations } from "../utils/hospitalScoring";

// Haversine distance in KM
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

// Leaflet Navigation Component
function NavigationMap({ origin, destination }) {
  const mapInstance = React.useRef(null);
  const mapContainerRef = React.useRef(null);
  const [distance, setDistance] = React.useState(null);
  const [mapLoaded, setMapLoaded] = React.useState(false);
  const [mapError, setMapError] = React.useState(null);

  // Check if Leaflet is loaded
  React.useEffect(() => {
    let pollCount = 0;
    const maxPolls = 50; // 5 seconds max wait
    const pollInterval = setInterval(() => {
      pollCount++;
      if (window.L && typeof window.L.map === 'function') {
        setMapLoaded(true);
        clearInterval(pollInterval);
      } else if (pollCount >= maxPolls) {
        clearInterval(pollInterval);
        setMapError("Leaflet map library failed to load. Please refresh the page.");
        console.error("Leaflet not found after polling");
      }
    }, 100);

    return () => clearInterval(pollInterval);
  }, []);

  // Map initialization
  React.useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || !origin || !destination) return;
    if (!origin.lat || !origin.lng || !destination.lat || !destination.lng) return;

    // Cleanup previous map instance if exists
    if (mapInstance.current) {
      try {
        if (mapInstance.current.remove && typeof mapInstance.current.remove === 'function') {
          mapInstance.current.remove();
        }
        if (mapContainerRef.current) {
          mapContainerRef.current.innerHTML = '';
        }
        mapInstance.current = null;
      } catch (e) {
        console.warn("Error cleaning up map:", e);
      }
    }

    try {
      // Initialize Leaflet map
      const map = window.L.map(mapContainerRef.current, {
        center: [origin.lat, origin.lng],
        zoom: 14,
      });

      // Add OpenStreetMap tiles
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add origin marker
      window.L.marker([origin.lat, origin.lng])
        .addTo(map)
        .bindPopup("Your Location");

      // Add destination marker
      window.L.marker([destination.lat, destination.lng])
        .addTo(map)
        .bindPopup((destination && destination.name) ? destination.name : "Hospital");

      // Add polyline connecting origin and destination
      window.L.polyline(
        [[origin.lat, origin.lng], [destination.lat, destination.lng]],
        { color: '#0891b2', weight: 4 }
      ).addTo(map);

      // Fit bounds to show both points
      const group = new window.L.featureGroup([
        window.L.marker([origin.lat, origin.lng]),
        window.L.marker([destination.lat, destination.lng]),
      ]);
      map.fitBounds(group.getBounds().pad(0.1));

      mapInstance.current = map;
      
      // Calculate distance
      const dist = haversineKm(origin, destination);
      setDistance(dist);
      setMapError(null);
    } catch (error) {
      console.error("Error initializing map:", error);
      setMapError(`Map initialization failed: ${error.message}`);
    }

    // Cleanup on unmount or dependency change
    return () => {
      if (mapInstance.current) {
        try {
          if (mapInstance.current.remove && typeof mapInstance.current.remove === 'function') {
            mapInstance.current.remove();
          }
          if (mapContainerRef.current) {
            mapContainerRef.current.innerHTML = '';
          }
          mapInstance.current = null;
        } catch (e) {
          console.warn("Error during map cleanup:", e);
        }
      }
    };
  }, [mapLoaded, origin, destination]);

  // Function to open Google Maps navigation
  const openGoogleMaps = () => {
    if (!origin || !destination || !origin.lat || !origin.lng || !destination.lat || !destination.lng) {
      return;
    }
    
    // Google Maps navigation URL format: 
    // https://www.google.com/maps/dir/?api=1&origin=LAT,LNG&destination=LAT,LNG
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}`;
    window.open(googleMapsUrl, '_blank');
  };

  return (
    <div style={{ position: 'relative' }}>
      {mapError && (
        <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-sm">
          {mapError}
        </div>
      )}
      {!mapLoaded && !mapError && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-sm">
          Loading map...
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <div
          ref={mapContainerRef}
          style={{ 
            width: "100%", 
            height: "400px", 
            borderRadius: "1rem", 
            marginBottom: 16,
            backgroundColor: "#f0f0f0",
            minHeight: "400px"
          }}
        />
        {/* Google Maps Navigation Button */}
        {mapLoaded && origin && destination && (
          <button
            onClick={openGoogleMaps}
            className="absolute top-4 right-4 z-[1000] flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xl transition-all hover:shadow-2xl transform hover:scale-105"
            style={{ zIndex: 1000 }}
            title="Open navigation in Google Maps"
          >
            <HiArrowTopRightOnSquare className="w-5 h-5" />
            <span>Open in Google Maps</span>
          </button>
        )}
      </div>
      {distance != null && (
        <div>
          <p>
            <b>Distance:</b> {distance < 1 ? `${(distance * 1000).toFixed(0)} m` : `${distance.toFixed(2)} km`}
          </p>
        </div>
      )}
    </div>
  );
}

export default function DriverDashboard() {
  const navigate = useNavigate();
  const locationIntervalRef = useRef(null);

  const [uid, setUid] = useState(null);
  const [driverData, setDriverData] = useState(null);
  const [location, setLocation] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [message, setMessage] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);

  const [serviceNeeded, setServiceNeeded] = useState("Basic");
  const [recommended, setRecommended] = useState(null);
  const [recommendLoading, setRecommendLoading] = useState(false);

  const [showNavigation, setShowNavigation] = useState(false);
  const [navigationHospital, setNavigationHospital] = useState(null);
  const [distanceToHospital, setDistanceToHospital] = useState(null);
  const [navigationUpdateInterval, setNavigationUpdateInterval] = useState(null);

  // Auth
  useEffect(() => {
    const sub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        navigate("/login");
        return;
      }
      setUid(u.uid);
    });
    return () => sub();
  }, [navigate]);

  // Driver info
  useEffect(() => {
    if (!uid) return;
    const r = ref(db, `drivers/${uid}`);
    const h = onValue(r, (snap) => {
      if (snap.exists()) setDriverData(snap.val());
    });
    return () => off(r, "value", h);
  }, [uid]);

  // Live location
  const getLiveLocation = async () =>
    new Promise((resolve) => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const { latitude: lat, longitude: lng } = pos.coords;
              if (uid) {
                await set(ref(db, `driverLocations/${uid}`), { lat, lng, updatedAt: Date.now() });
                setLocation({ lat, lng, updatedAt: Date.now() });
              }
            } catch (e) {
              console.error("save loc error", e);
            }
            resolve();
          },
          () => resolve(),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        resolve();
      }
    });

  useEffect(() => {
    if (!uid) return;
    getLiveLocation();
    locationIntervalRef.current = setInterval(() => getLiveLocation(), 30000);
    return () => clearInterval(locationIntervalRef.current || 0);
  }, [uid]);

  const handleManualLocationUpdate = async () => {
    setLocationLoading(true);
    await getLiveLocation();
    setMessage("✅ Location updated!");
    setTimeout(() => setMessage(""), 2500);
    setLocationLoading(false);
  };

  // Hospitals stream
  useEffect(() => {
    const r = ref(db, "hospitals");
    const h = onValue(r, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([id, hospital]) => ({ id, ...hospital }));
      setHospitals(list);
    });
    return () => off(r, "value", h);
  }, []);

  const driverProfile = driverData?.profile || {};
  const driverDocs = driverData?.documents || {};

  // AI Recommendation logic
  const handleGetRecommendation = async () => {
    setRecommendLoading(true);
    setRecommended(null);

    try {
      if (!location || hospitals.length === 0) {
        setMessage("❌ Data not available");
        setRecommendLoading(false);
        return;
      }

      const hospitalsObj = Object.fromEntries(hospitals.map((h) => [h.id, h]));
      const result = getTopRecommendations(hospitalsObj, location.lat, location.lng, serviceNeeded);

      setRecommended(result);

      if (result?.recommended) {
        setMessage(`✅ Best match: ${result.recommended.name}`);
      } else {
        setMessage("❌ No matching hospitals");
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage("❌ Error: " + error.message);
    } finally {
      setRecommendLoading(false);
    }
  };

  // Main handler for navigation (works for any hospital)
  const handleAlertHospital = async (hospital) => {
    if (!uid || !hospital || !driverData || !location) {
      setMessage("❌ Missing required info");
      return;
    }

    try {
      const preAlertData = {
        driverId: uid,
        driverName: driverProfile.fullName || "Unknown",
        driverPhone: driverProfile.phone || "No phone",
        ambulanceType: driverDocs.ambulanceType || "Standard",
        ambulanceNumber: driverDocs.vehicleNumber || "No vehicle",
        hospitalName: hospital.name,
        hospitalPhone: hospital.contact?.phone || "No phone",
        status: "en_route",
        createdAt: Date.now(),
        driverLocation: { lat: location.lat, lng: location.lng },
      };

      const alertPath = `prealerts/${hospital.id}/${Date.now()}`;
      await set(ref(db, alertPath), preAlertData);

      setMessage(`✅ Alert sent to ${hospital.name}!`);

      setNavigationHospital({
        ...hospital,
        id: hospital.id,
        location: hospitals.find((h) => h.id === hospital.id)?.location,
      });
      setShowNavigation(true);

      const interval = setInterval(async () => {
        await getLiveLocation();
      }, 5000);
      setNavigationUpdateInterval(interval);

      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error:", error);
      setMessage("❌ Error: " + error.message);
    }
  };

  useEffect(() => {
    if (!showNavigation || !navigationHospital || !location) return;
    const dist = haversineKm(location, navigationHospital.location);
    setDistanceToHospital(dist);
  }, [location, navigationHospital, showNavigation]);

  const handleJobComplete = async () => {
    if (distanceToHospital > 0.5) {
      setMessage("⚠️ Distance must be ≤ 500 meters");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    try {
      if (navigationHospital?.id) {
        const inflowRef = ref(db, `hospitals/${navigationHospital.id}/stats/inflowActive`);
        const currentCount = await new Promise((resolve) => {
          onValue(inflowRef, (snap) => {
            resolve(snap.val() || 0);
          }, { onlyOnce: true });
        });

        const newCount = Math.max(0, (currentCount || 0) - 1);
        await set(inflowRef, newCount);
      }

      setMessage("✅ Job completed!");
      setShowNavigation(false);
      setNavigationHospital(null);
      setRecommended(null);
      setServiceNeeded("Basic");

      if (navigationUpdateInterval) {
        clearInterval(navigationUpdateInterval);
        setNavigationUpdateInterval(null);
      }

      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error:", error);
      setMessage("❌ Error: " + error.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch {
      setMessage("❌ Sign out failed");
      setTimeout(() => setMessage(""), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-cyan-100 to-teal-100 dark:from-blue-950 dark:via-cyan-900 dark:to-teal-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-black text-cyan-800 dark:text-cyan-100">🚑 Driver Hub</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/80 dark:bg-zinc-900/80 ring-1 ring-cyan-200 dark:ring-cyan-900 shadow">
              <HiMapPin className="w-5 h-5 text-cyan-600" />
              <div className="text-xs md:text-sm text-cyan-800 dark:text-cyan-100 font-semibold">
                {location ? `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}` : "Locating..."}
              </div>
              <button
                onClick={handleManualLocationUpdate}
                disabled={locationLoading}
                className="text-xs px-2 py-1 rounded bg-cyan-600 text-white hover:bg-cyan-700 disabled:bg-gray-400"
              >
                {locationLoading ? "..." : "Update"}
              </button>
            </div>
            <button
              onClick={handleSignOut}
              className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all shadow-lg"
              title="Sign out"
            >
              <HiArrowLeftOnRectangle className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Toast */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 rounded-lg text-center font-semibold bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Driver Info Card */}
        <div className="rounded-xl p-4 bg-white/80 dark:bg-zinc-900/80 ring-1 ring-cyan-100 dark:ring-cyan-900 shadow">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
            <div>
              <p className="text-cyan-700 dark:text-cyan-300 font-semibold">Name</p>
              <p className="font-bold">{driverProfile.fullName || "—"}</p>
            </div>
            <div>
              <p className="text-cyan-700 dark:text-cyan-300 font-semibold">Phone</p>
              <p className="font-bold">{driverProfile.phone || "—"}</p>
            </div>
            <div>
              <p className="text-cyan-700 dark:text-cyan-300 font-semibold">License</p>
              <p className="font-bold">{driverDocs.licenseNumber || "—"}</p>
            </div>
            <div>
              <p className="text-cyan-700 dark:text-cyan-300 font-semibold">Vehicle</p>
              <p className="font-bold">{driverDocs.vehicleNumber || "—"}</p>
            </div>
            <div>
              <p className="text-cyan-700 dark:text-cyan-300 font-semibold">Type</p>
              <p className="font-bold">{driverDocs.ambulanceType || "—"}</p>
            </div>
            <div>
              <p className="text-cyan-700 dark:text-cyan-300 font-semibold">Status</p>
              <p className="font-bold text-green-600">Active</p>
            </div>
          </div>
        </div>

        {/* Recommendation or Navigation section */}
        {!showNavigation ? (
          <div className="rounded-2xl p-4 bg-white/80 dark:bg-zinc-900/80 ring-1 ring-cyan-100 dark:ring-cyan-900 shadow-lg">
            <h2 className="text-xl font-bold text-cyan-800 dark:text-cyan-100 mb-3">🤖 AI Hospital Recommender</h2>
            <div className="flex gap-2 mb-3">
              <select
                value={serviceNeeded}
                onChange={e => setServiceNeeded(e.target.value)}
                className="flex-1 px-3 py-2 rounded border border-cyan-300 dark:border-cyan-700 bg-white dark:bg-zinc-800 text-sm"
              >
                <option value="Basic">Basic Care</option>
                <option value="Advanced">Advanced Care</option>
                <option value="ICU">ICU Care</option>
                <option value="Emergency">Emergency</option>
              </select>
              <button
                onClick={handleGetRecommendation}
                disabled={recommendLoading || !location}
                className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-700 text-white font-semibold disabled:bg-gray-400"
              >
                {recommendLoading ? "🔄 Analyzing..." : "🎯 Get Recommendation"}
              </button>
            </div>
            <AnimatePresence>
              {recommended?.recommended && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2">
                  {/* Main recommendation */}
                  <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 border-2 border-green-500">
                    <p className="font-bold text-green-900 dark:text-green-100 text-lg">
                      ✅ BEST MATCH: {recommended.recommended.name}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <span className="text-green-800 dark:text-green-200">📍 Distance: {recommended.recommended.distance} km</span>
                      <span className="text-green-800 dark:text-green-200">🚑 Incoming: {recommended.recommended.incomingAmbulances}</span>
                      <span className="text-green-800 dark:text-green-200">🛏️ Beds: {recommended.recommended.beds}</span>
                      <span className="text-green-800 dark:text-green-200">⭐ Score: {recommended.recommended.totalScore}</span>
                    </div>
                    <button
                      onClick={() => handleAlertHospital(recommended.recommended)}
                      className="w-full mt-3 px-3 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-semibold"
                    >
                      Alert & Navigate
                    </button>
                  </div>
                  {/* Alternatives */}
                  {recommended.alternates && recommended.alternates.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-semibold text-cyan-800 dark:text-cyan-100 mb-2">📋 Alternatives:</p>
                      {recommended.alternates.map((alt, idx) => (
                        <div key={alt.id || idx}
                          className="p-2 mb-2 rounded bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 flex flex-col">
                          <span className="font-bold text-cyan-800 dark:text-cyan-200">{idx + 2}. {alt.name}</span>
                          <span className="text-xs text-cyan-700 dark:text-cyan-300">
                            {alt.distance} km • Incoming: {alt.incomingAmbulances} • Beds: {alt.beds}
                          </span>
                          <button
                            onClick={() => handleAlertHospital(alt)}
                            className="w-full mt-2 px-3 py-2 rounded bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold"
                          >
                            Alert & Navigate
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="rounded-2xl p-4 bg-white/80 dark:bg-zinc-900/80 ring-1 ring-cyan-100 dark:ring-cyan-900 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-cyan-800 dark:text-cyan-100">
                📍 Navigation to {navigationHospital?.name}
              </h2>
              <button
                onClick={() => {
                  setShowNavigation(false);
                  setNavigationHospital(null);
                  if (navigationUpdateInterval) clearInterval(navigationUpdateInterval);
                }}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <HiXMark className="w-6 h-6" />
              </button>
            </div>
            {navigationHospital?.location && location && (
              <NavigationMap 
                origin={location} 
                destination={{
                  ...navigationHospital.location,
                  name: navigationHospital.name
                }} 
              />
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold">Distance to Hospital</p>
                <p className="text-2xl font-extrabold text-blue-900 dark:text-blue-100">
                  {distanceToHospital ? (distanceToHospital < 1 ? `${(distanceToHospital * 1000).toFixed(0)} m` : `${distanceToHospital.toFixed(2)} km`) : "—"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <p className="text-xs text-purple-700 dark:text-purple-300 font-semibold">Status</p>
                <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                  {distanceToHospital && distanceToHospital <= 0.5 ? "✅ Arrived" : "🚗 En Route"}
                </p>
              </div>
            </div>

            <button
              onClick={handleJobComplete}
              disabled={!distanceToHospital || distanceToHospital > 0.5}
              className={`w-full mt-4 px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                distanceToHospital && distanceToHospital <= 0.5
                  ? "bg-green-600 hover:bg-green-700 text-white shadow-lg"
                  : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              }`}
              title={distanceToHospital && distanceToHospital > 0.5 ? `Distance must be ≤ 500m (Current: ${(distanceToHospital * 1000).toFixed(0)}m)` : "Mark job as complete"}
            >
              <HiCheckCircle className="w-6 h-6" />
              Job Completed
            </button>

            {distanceToHospital && distanceToHospital > 0.5 && (
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-3 text-center">
                ⚠️ Get closer to the hospital to complete the job (Current distance: {distanceToHospital < 1 ? `${(distanceToHospital * 1000).toFixed(0)}m` : `${distanceToHospital.toFixed(2)}km`})
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
