import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";
import { db } from "../firebase/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { HiMapPin } from "react-icons/hi2";

const emailKey = (email) => email.toLowerCase().trim().replace(/\./g, ",");

export default function HospitalRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    license: "",
    address: "",
    password: "",
    confirmPassword: "",
    contactPerson: "",
    contactPersonEmail: "",
    contactPersonPhone: "",
    beds: "",
    icuBeds: "",
    emergencyAvailable: "",
    operatingFacilities: "",
    doctorCount: "",
    nurseCount: "",
    lat: 0,
    lng: 0,
  });

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm({
      ...form,
      [name]: type === "radio" ? (value === "yes" ? true : false) : value,
    });
  };

  // Get location and area name
  const handleGetLocation = async () => {
    setGeoLoading(true);
    setError("");

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude: lat, longitude: lng } = pos.coords;
            setForm((prev) => ({
              ...prev,
              lat: parseFloat(lat.toFixed(6)),
              lng: parseFloat(lng.toFixed(6)),
            }));

            // Get area name using reverse geocoding (OpenStreetMap)
            const areaName = await reverseGeocode(lat, lng);
            if (areaName) {
              setForm((prev) => ({
                ...prev,
                address: areaName,
              }));
              setSuccess("✅ Location detected: " + areaName);
            } else {
              setSuccess(`✅ Location set: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            }
            setTimeout(() => setSuccess(""), 3000);
          } catch (err) {
            setError("❌ Error processing location");
          } finally {
            setGeoLoading(false);
          }
        },
        (err) => {
          setError("❌ " + err.message);
          setGeoLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setError("❌ Geolocation not supported");
      setGeoLoading(false);
    }
  };

  // Reverse geocoding using OpenStreetMap (free, no API key needed)
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();

      if (data.address) {
        const parts = [];
        if (data.address.hospital) parts.push(data.address.hospital);
        if (data.address.suburb) parts.push(data.address.suburb);
        if (data.address.city) parts.push(data.address.city);
        if (data.address.state) parts.push(data.address.state);
        if (data.address.country) parts.push(data.address.country);

        return parts.filter(Boolean).join(", ") || data.address.road || "";
      }
      return "";
    } catch (err) {
      console.warn("Reverse geocoding error:", err);
      return "";
    }
  };

  const nextSection = () => {
    if (step === 1) {
      if (!form.name.trim() || !form.email.trim() || !form.license.trim()) {
        setError("Please fill all hospital details.");
        return;
      }
      if (!form.address.trim()) {
        setError("Please set hospital location.");
        return;
      }
      if (!form.password || form.password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      setError("");
    }
    if (step === 2) {
      if (
        !form.contactPerson.trim() ||
        !form.contactPersonEmail.trim() ||
        !form.contactPersonPhone.trim()
      ) {
        setError("Please fill all contact details.");
        return;
      }
      setError("");
    }
    setDirection(1);
    setStep((s) => Math.min(s + 1, 3));
  };

  const prevSection = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.beds || Number(form.beds) < 0) {
      setError("Please enter a valid number of beds.");
      return;
    }
    if (!form.icuBeds || Number(form.icuBeds) < 0) {
      setError("Please enter a valid number of ICU beds.");
      return;
    }
    if (form.emergencyAvailable !== true && form.emergencyAvailable !== false) {
      setError("Please select whether emergency services are available.");
      return;
    }
    if (!form.operatingFacilities.trim() || !form.doctorCount || !form.nurseCount) {
      setError("Please fill all capacity and facility details.");
      return;
    }

    setLoading(true);
    try {
      const auth = getAuth();
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);

      const uid = cred.user.uid;

      // Call backend to set role claim
      try {
        const roleRes = await fetch("http://localhost:8080/api/setRoleClaim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid, role: "hospital" }),
        });
        if (!roleRes.ok) {
          console.warn("Failed to set role claim");
        }
      } catch (err) {
        console.warn("Role claim error:", err);
      }

      // Refresh token to get updated claims
      await cred.user.getIdTokenResult(true);

      // Save hospital profile with location
      await set(ref(db, `hospitals/${uid}`), {
        profile: {
          name: form.name.trim(),
          licenceNo: form.license.trim(),
        },
        contact: {
          email: form.email.trim(),
          phone: form.contactPersonPhone.trim(),
          person: form.contactPerson.trim(),
          personEmail: form.contactPersonEmail.trim(),
        },
        location: {
          address: form.address.trim(),
          lat: form.lat,
          lng: form.lng,
        },
        capacity: {
          bedsTotal: Number(form.beds) || 0,
          icuTotal: Number(form.icuBeds) || 0,
        },
        stats: {
          bedsOccupied: 0,
          icuOccupied: 0,
          admittedCount: 0,
          inflowActive: 0,
        },
        resources: {
          emergencyAvailable: form.emergencyAvailable === true,
          operatingFacilities: form.operatingFacilities.trim(),
        },
        staff: {
          doctorCount: Number(form.doctorCount) || 0,
          nurseCount: Number(form.nurseCount) || 0,
        },
        settings: {
          acceptingPrealerts: true,
        },
        uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Save role lookups
      await Promise.all([
        set(ref(db, `userRoles/${uid}`), "hospital"),
        set(ref(db, `emailToRole/${emailKey(form.email)}`), { uid, role: "hospital" }),
      ]);

      setSuccess("✅ Registration successful! Redirecting to login...");
      setForm({
        name: "",
        email: "",
        license: "",
        address: "",
        password: "",
        confirmPassword: "",
        contactPerson: "",
        contactPersonEmail: "",
        contactPersonPhone: "",
        beds: "",
        icuBeds: "",
        emergencyAvailable: "",
        operatingFacilities: "",
        doctorCount: "",
        nurseCount: "",
        lat: 0,
        lng: 0,
      });
      setStep(1);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError("⚠️ " + (err?.message || "Registration failed"));
      console.error("Registration error:", err);
    } finally {
      setLoading(false);
    }
  };

  const stepVariants = {
    initial: (dir) => ({
      x: dir > 0 ? 200 : -200,
      opacity: 0,
      scale: 0.9,
    }),
    animate: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { duration: 0.6, type: "spring" },
    },
    exit: (dir) => ({
      x: dir > 0 ? -200 : 200,
      opacity: 0,
      scale: 0.9,
      transition: { duration: 0.4 },
    }),
  };

  const Stepper = () => (
    <div className="flex items-center justify-center gap-10 mb-10">
      {["Hospital", "Contact", "Capacity"].map((label, index) => {
        const num = index + 1;
        return (
          <motion.div
            key={num}
            initial={{ scale: 0 }}
            animate={{ scale: step >= num ? 1 : 0.8 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="flex flex-col items-center"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white
              ${step === num ? "bg-cyan-600 shadow-lg ring-4 ring-cyan-300" : "bg-cyan-400/70"}`}
            >
              <button
                type="button"
                onClick={() => {
                  if (num < step || step === 3) setStep(num);
                }}
                className="w-full h-full"
              >
                {num}
              </button>
            </div>
            <span
              className={`mt-2 text-sm font-semibold ${
                step === num ? "text-cyan-700 dark:text-cyan-300" : "text-cyan-500 dark:text-cyan-400"
              }`}
            >
              {label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );

  const inputClass =
    "w-full px-4 py-3 border-2 border-cyan-400 dark:border-cyan-700 bg-cyan-50 dark:bg-zinc-800 text-gray-900 dark:text-cyan-50 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-400 transition mb-4";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-blue-100 via-cyan-200 to-teal-100 dark:from-blue-950 dark:via-cyan-900 dark:to-teal-950 transition-colors">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl w-full p-8 md:p-12 rounded-2xl shadow-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-cyan-100 dark:border-cyan-900"
      >
        <div className="text-center mb-6">
          <h2 className="text-3xl font-black text-cyan-700 dark:text-cyan-200 mb-2 drop-shadow">
            Hospital Registration
          </h2>
        </div>

        <Stepper />

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 p-3 rounded-md mb-4 text-center"
          >
            {success}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-3 rounded-md mb-4 text-center"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit}>
          <AnimatePresence custom={direction} mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                custom={direction}
              >
                <h3 className="text-xl font-bold text-cyan-700 dark:text-cyan-300 mb-4 text-center">
                  Hospital Details
                </h3>
                <input
                  name="name"
                  placeholder="Hospital Name"
                  value={form.name}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
                <input
                  name="email"
                  type="email"
                  placeholder="Official Email"
                  value={form.email}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
                <input
                  name="license"
                  placeholder="License / Registration No."
                  value={form.license}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />

                {/* Location Field with GPS Button */}
                <label className="block text-sm font-semibold text-cyan-800 dark:text-cyan-200 mb-2">
                  Hospital Location
                </label>
                <div className="flex gap-2 mb-4">
                  <input
                    name="address"
                    placeholder="Hospital address (auto-detected or enter manually)"
                    value={form.address}
                    onChange={handleChange}
                    className="flex-1 px-4 py-3 border-2 border-cyan-400 dark:border-cyan-700 bg-cyan-50 dark:bg-zinc-800 text-gray-900 dark:text-cyan-50 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-400 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={geoLoading}
                    className={`px-4 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                      geoLoading
                        ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                        : "bg-cyan-600 hover:bg-cyan-700 text-white"
                    }`}
                  >
                    <HiMapPin className="w-5 h-5" />
                    {geoLoading ? "Getting..." : "SET"}
                  </button>
                </div>

                {form.lat && form.lng && (
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
                    <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                      ✅ Location set: {form.lat.toFixed(4)}, {form.lng.toFixed(4)}
                    </p>
                  </div>
                )}

                <input
                  name="password"
                  type="password"
                  placeholder="Set Password (min 8 chars)"
                  value={form.password}
                  onChange={handleChange}
                  className={inputClass}
                  required
                  minLength={8}
                />
                <input
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm Password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className={inputClass}
                  required
                  minLength={8}
                />
                <div className="flex justify-end mt-4">
                  <button
                    type="button"
                    onClick={nextSection}
                    className="px-6 py-2 bg-cyan-600 hover:bg-teal-500 text-white rounded-lg font-semibold shadow-lg transition-all"
                  >
                    Next →
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                custom={direction}
              >
                <h3 className="text-xl font-bold text-cyan-700 dark:text-cyan-300 mb-4 text-center">
                  Contact Person Details
                </h3>
                <input
                  name="contactPerson"
                  placeholder="Contact Person Name"
                  value={form.contactPerson}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
                <input
                  name="contactPersonEmail"
                  type="email"
                  placeholder="Contact Email"
                  value={form.contactPersonEmail}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
                <input
                  name="contactPersonPhone"
                  type="tel"
                  placeholder="Contact Phone Number"
                  value={form.contactPersonPhone}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={prevSection}
                    className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold shadow-lg transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={nextSection}
                    className="px-6 py-2 bg-cyan-600 hover:bg-teal-500 text-white rounded-lg font-semibold shadow-lg transition-all"
                  >
                    Next →
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                custom={direction}
              >
                <h3 className="text-xl font-bold text-cyan-700 dark:text-cyan-300 mb-4 text-center">
                  Capacity & Facilities
                </h3>
                <input
                  name="beds"
                  type="number"
                  placeholder="Total Beds"
                  value={form.beds}
                  onChange={handleChange}
                  className={inputClass}
                  required
                  min="0"
                />
                <input
                  name="icuBeds"
                  type="number"
                  placeholder="Total ICU Beds"
                  value={form.icuBeds}
                  onChange={handleChange}
                  className={inputClass}
                  required
                  min="0"
                />
                <label className="block font-semibold text-cyan-700 dark:text-cyan-300 mb-2">
                  Emergency Services Available?
                </label>
                <div className="flex gap-8 mb-4">
                  <label className="flex items-center gap-2 text-gray-800 dark:text-cyan-50">
                    <input
                      type="radio"
                      name="emergencyAvailable"
                      value="yes"
                      checked={form.emergencyAvailable === true}
                      onChange={handleChange}
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-2 text-gray-800 dark:text-cyan-50">
                    <input
                      type="radio"
                      name="emergencyAvailable"
                      value="no"
                      checked={form.emergencyAvailable === false}
                      onChange={handleChange}
                    />
                    No
                  </label>
                </div>
                <input
                  name="operatingFacilities"
                  placeholder="Operating Facilities (e.g. ICU, Surgery)"
                  value={form.operatingFacilities}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
                <input
                  name="doctorCount"
                  type="number"
                  placeholder="Number of Doctors"
                  value={form.doctorCount}
                  onChange={handleChange}
                  className={inputClass}
                  required
                  min="0"
                />
                <input
                  name="nurseCount"
                  type="number"
                  placeholder="Number of Nurses"
                  value={form.nurseCount}
                  onChange={handleChange}
                  className={inputClass}
                  required
                  min="0"
                />
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={prevSection}
                    className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold shadow-lg transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-green-600 hover:bg-teal-600 disabled:bg-gray-400 text-white rounded-lg font-semibold shadow-lg transition-all"
                  >
                    {loading ? "Registering..." : "Register"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>
    </div>
  );
}
