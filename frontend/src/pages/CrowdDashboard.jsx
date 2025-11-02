import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ref, onValue, off, set } from "firebase/database";
import { db } from "../firebase/firebase";
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

  React.useEffect(() => {
    let pollCount = 0;
    const maxPolls = 50;
    const pollInterval = setInterval(() => {
      pollCount++;
      if (window.L && typeof window.L.map === 'function') {
        setMapLoaded(true);
        clearInterval(pollInterval);
      } else if (pollCount >= maxPolls) {
        clearInterval(pollInterval);
        setMapError("Map library failed to load. Please refresh.");
        console.error("Leaflet not found after polling");
      }
    }, 100);

    return () => clearInterval(pollInterval);
  }, []);

  React.useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || !origin || !destination) return;
    if (!origin.lat || !origin.lng || !destination.lat || !destination.lng) return;

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
      const map = window.L.map(mapContainerRef.current, {
        center: [origin.lat, origin.lng],
        zoom: 14,
      });

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      window.L.marker([origin.lat, origin.lng])
        .addTo(map)
        .bindPopup("Your Location");

      window.L.marker([destination.lat, destination.lng])
        .addTo(map)
        .bindPopup((destination && destination.name) ? destination.name : "Hospital");

      window.L.polyline(
        [[origin.lat, origin.lng], [destination.lat, destination.lng]],
        { color: '#0891b2', weight: 4 }
      ).addTo(map);

      const group = new window.L.featureGroup([
        window.L.marker([origin.lat, origin.lng]),
        window.L.marker([destination.lat, destination.lng]),
      ]);
      map.fitBounds(group.getBounds().pad(0.1));

      mapInstance.current = map;
      
      const dist = haversineKm(origin, destination);
      setDistance(dist);
      setMapError(null);
    } catch (error) {
      console.error("Error initializing map:", error);
      setMapError(`Map initialization failed: ${error.message}`);
    }

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

  const openGoogleMaps = () => {
    if (!origin || !destination || !origin.lat || !origin.lng || !destination.lat || !destination.lng) {
      return;
    }
    
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

export default function CrowdDashboard() {
  const navigate = useNavigate();
  const locationIntervalRef = useRef(null);

  const [contactNumber, setContactNumber] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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

  // Handle login with contact number only
  const handleLogin = (e) => {
    e.preventDefault();
    if (!contactNumber || contactNumber.length < 10) {
      setMessage("❌ Please enter a valid contact number");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    setIsLoggedIn(true);
    setMessage(`✅ Welcome! Logged in with ${contactNumber}`);
    setTimeout(() => setMessage(""), 3000);
  };

  // Live location
  const getLiveLocation = async () =>
    new Promise((resolve) => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const { latitude: lat, longitude: lng } = pos.coords;
              setLocation({ lat, lng, updatedAt: Date.now() });
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
    if (!isLoggedIn) return;
    getLiveLocation();
    locationIntervalRef.current = setInterval(() => getLiveLocation(), 30000);
    return () => clearInterval(locationIntervalRef.current || 0);
  }, [isLoggedIn]);

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

  // Alert hospital (updated to use prealerts path and pending status for consistency with hospital dashboard)
  const handleAlertHospital = async (hospital) => {
    if (!hospital || !location) {
      setMessage("❌ Missing required info");
      return;
    }

    try {
      const alertData = {
        type: "crowd",
        contactNumber: contactNumber,
        hospitalName: hospital.name,
        hospitalPhone: hospital.contact?.phone || "No phone",
        status: "pending", // Changed to "pending" to match hospital accept/decline flow
        createdAt: Date.now(),
        userLocation: { lat: location.lat, lng: location.lng },
      };

      // Updated path to prealerts for unified handling in hospital dashboard
      const alertPath = `prealerts/${hospital.id}/${Date.now()}`;
      await set(ref(db, alertPath), alertData);

      setMessage(`✅ Alert sent to ${hospital.name}! Hospital will review shortly.`);

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
      setMessage("✅ Reached hospital! Thank you.");
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

  const handleLogout = () => {
    setIsLoggedIn(false);
    setContactNumber("");
    setLocation(null);
    setRecommended(null);
    setShowNavigation(false);
    setNavigationHospital(null);
    if (navigationUpdateInterval) {
      clearInterval(navigationUpdateInterval);
      setNavigationUpdateInterval(null);
    }
    setMessage("✅ Logged out successfully");
    setTimeout(() => setMessage(""), 2500);
  };

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-cyan-100 to-teal-100 dark:from-blue-950 dark:via-cyan-900 dark:to-teal-950 p-4 md:p-8 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full p-8"
        >
          <h1 className="text-3xl md:text-4xl font-black text-cyan-800 dark:text-cyan-100 mb-6 text-center">
            🚨 Emergency Call
          </h1>
          
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-3 rounded-lg text-center font-semibold bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
              >
                {message}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-cyan-800 dark:text-cyan-100 mb-2">
                Contact Number *
              </label>
              <input
                type="tel"
                placeholder="Enter your contact number"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-cyan-300 dark:border-cyan-700 bg-white dark:bg-zinc-800 text-cyan-900 dark:text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-600"
              />
              <p className="text-xs text-cyan-700 dark:text-cyan-300 mt-1">Format: 10 digits (e.g., 9876543210)</p>
            </div>

            <button
              type="submit"
              className="w-full px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-lg transition-all shadow-lg hover:shadow-xl"
            >
              Login & Get Help
            </button>
          </form>

          <p className="text-center text-cyan-700 dark:text-cyan-300 text-sm mt-6">
            For medical emergencies, get AI-recommended hospitals near you instantly.
          </p>
        </motion.div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-cyan-100 to-teal-100 dark:from-blue-950 dark:via-cyan-900 dark:to-teal-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-black text-red-600 dark:text-red-400">🚨 Emergency Help</h1>
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
              onClick={handleLogout}
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

        {/* Crowd Info Card */}
        <div className="rounded-xl p-4 bg-white/80 dark:bg-zinc-900/80 ring-1 ring-cyan-100 dark:ring-cyan-900 shadow">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-cyan-700 dark:text-cyan-300 font-semibold">Contact Number</p>
              <p className="font-bold">{contactNumber}</p>
            </div>
            <div>
              <p className="text-cyan-700 dark:text-cyan-300 font-semibold">Status</p>
              <p className="font-bold text-red-600">Emergency</p>
            </div>
            <div>
              <p className="text-cyan-700 dark:text-cyan-300 font-semibold">Location</p>
              <p className="font-bold text-green-600">Active</p>
            </div>
          </div>
        </div>

        {/* Recommendation or Navigation section */}
        {!showNavigation ? (
          <div className="rounded-2xl p-4 bg-white/80 dark:bg-zinc-900/80 ring-1 ring-cyan-100 dark:ring-cyan-900 shadow-lg">
            <h2 className="text-xl font-bold text-cyan-800 dark:text-cyan-100 mb-3">🏥 Find Nearest Hospital</h2>
            <div className="flex gap-2 mb-3">
              <select
                value={serviceNeeded}
                onChange={e => setServiceNeeded(e.target.value)}
                className="flex-1 px-3 py-2 rounded border border-cyan-300 dark:border-cyan-700 bg-white dark:bg-zinc-800 text-sm"
              >
                <option value="Basic">Basic Medical</option>
                <option value="Advanced">Advanced Care</option>
                <option value="ICU">ICU Care</option>
                <option value="Emergency">Critical Emergency</option>
              </select>
              <button
                onClick={handleGetRecommendation}
                disabled={recommendLoading || !location}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold disabled:bg-gray-400"
              >
                {recommendLoading ? "🔄 Finding..." : "🎯 Find Hospital"}
              </button>
            </div>
            <AnimatePresence>
              {recommended?.recommended && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-2">
                  {/* Main recommendation */}
                  <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 border-2 border-green-500">
                    <p className="font-bold text-green-900 dark:text-green-100 text-lg">
                      ✅ NEAREST HOSPITAL: {recommended.recommended.name}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <span className="text-green-800 dark:text-green-200">📍 Distance: {recommended.recommended.distance} km</span>
                      <span className="text-green-800 dark:text-green-200">🚑 Incoming: {recommended.recommended.incomingAmbulances}</span>
                      <span className="text-green-800 dark:text-green-200">🛏️ Beds: {recommended.recommended.beds}</span>
                      <span className="text-green-800 dark:text-green-200">⭐ Score: {recommended.recommended.totalScore}</span>
                    </div>
                    <button
                      onClick={() => handleAlertHospital(recommended.recommended)}
                      className="w-full mt-3 px-3 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold"
                    >
                      Alert Hospital & Navigate
                    </button>
                  </div>
                  {/* Alternatives */}
                  {recommended.alternates && recommended.alternates.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-semibold text-cyan-800 dark:text-cyan-100 mb-2">📋 Other Options:</p>
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
                            Select This Hospital
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
                📍 Navigate to {navigationHospital?.name}
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
                <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold">Distance</p>
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
              title={distanceToHospital && distanceToHospital > 0.5 ? `Distance must be ≤ 500m` : "Mark as arrived"}
            >
              <HiCheckCircle className="w-6 h-6" />
              I've Arrived
            </button>

            {distanceToHospital && distanceToHospital > 0.5 && (
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-3 text-center">
                ⚠️ Get closer to the hospital (Current: {distanceToHospital < 1 ? `${(distanceToHospital * 1000).toFixed(0)}m` : `${distanceToHospital.toFixed(2)}km`})
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
