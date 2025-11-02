import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";
import { db } from "../firebase/firebase";
import { motion, AnimatePresence } from "framer-motion";

const emailKey = (email) => email.toLowerCase().trim().replace(/\./g, ",");

export default function DriverRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    licenseNumber: "",
    vehicleNumber: "",
    ambulanceType: "",
    servingHospital: "",
    experienceYears: "",
    shiftAvailability: "",
  });

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const inputClass =
    "w-full px-4 py-3 border-2 border-cyan-400 dark:border-cyan-700 bg-cyan-50 dark:bg-zinc-800 text-gray-900 dark:text-cyan-50 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-400 transition mb-4";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const nextSection = () => {
    if (step === 1) {
      if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim()) {
        setError("Please fill your basic details.");
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
      if (!form.licenseNumber.trim() || !form.vehicleNumber.trim() || !form.ambulanceType) {
        setError("Please fill license, vehicle, and ambulance type.");
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

    if (!form.shiftAvailability || !form.experienceYears) {
      setError("Please select your shift and add experience.");
      return;
    }

    setLoading(true);
    try {
      const auth = getAuth();
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const uid = cred.user.uid;
      const role = "driver";

      // Call backend to set role claim
      try {
        const roleRes = await fetch("http://localhost:8080/api/setRoleClaim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid, role }),
        });
        if (!roleRes.ok) {
          console.warn("Failed to set role claim");
        }
      } catch (err) {
        console.warn("Role claim error:", err);
      }

      // Refresh token to get updated claims
      await cred.user.getIdTokenResult(true);

      // Save driver profile with complete schema
      await set(ref(db, `drivers/${uid}`), {
        profile: {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        },
        documents: {
          licenseNumber: form.licenseNumber.trim(),
          vehicleNumber: form.vehicleNumber.trim(),
          ambulanceType: form.ambulanceType,
        },
        work: {
          servingHospital: form.servingHospital.trim() || "",
          experienceYears: Number(form.experienceYears) || 0,
          shiftAvailability: form.shiftAvailability,
        },
        status: "available",
        uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Role lookups
      await Promise.all([
        set(ref(db, `userRoles/${uid}`), role),
        set(ref(db, `emailToRole/${emailKey(form.email)}`), { uid, role }),
      ]);

      setSuccess("✅ Driver registered! Redirecting to login...");
      setForm({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        licenseNumber: "",
        vehicleNumber: "",
        ambulanceType: "",
        servingHospital: "",
        experienceYears: "",
        shiftAvailability: "",
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
    initial: (dir) => ({ x: dir > 0 ? 200 : -200, opacity: 0, scale: 0.9 }),
    animate: { x: 0, opacity: 1, scale: 1, transition: { duration: 0.6, type: "spring" } },
    exit: (dir) => ({ x: dir > 0 ? -200 : 200, opacity: 0, scale: 0.9, transition: { duration: 0.4 } }),
  };

  const Stepper = () => (
    <div className="flex items-center justify-center gap-10 mb-10">
      {["Basic", "Documents", "Work"].map((label, i) => {
        const num = i + 1;
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
                onClick={() => setStep(num)}
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
            Driver Registration
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
                key="s1"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                custom={direction}
              >
                <h3 className="text-xl font-bold text-cyan-700 dark:text-cyan-300 mb-4 text-center">
                  Basic Details
                </h3>
                <input
                  name="fullName"
                  placeholder="Full Name"
                  value={form.fullName}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
                <input
                  name="email"
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
                <input
                  name="phone"
                  type="tel"
                  placeholder="Phone Number"
                  value={form.phone}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
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
                <div className="flex justify-end mt-2">
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
                key="s2"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                custom={direction}
              >
                <h3 className="text-xl font-bold text-cyan-700 dark:text-cyan-300 mb-4 text-center">
                  Documents & Vehicle
                </h3>
                <input
                  name="licenseNumber"
                  placeholder="Driver License Number"
                  value={form.licenseNumber}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
                <input
                  name="vehicleNumber"
                  placeholder="Ambulance Vehicle Number"
                  value={form.vehicleNumber}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
                <select
                  name="ambulanceType"
                  value={form.ambulanceType}
                  onChange={handleChange}
                  className={inputClass}
                  required
                >
                  <option value="">Select Ambulance Type</option>
                  <option value="Basic">Basic</option>
                  <option value="Advanced">Advanced</option>
                  <option value="ICU">ICU</option>
                </select>
                <div className="flex gap-3 mt-2">
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
                key="s3"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                custom={direction}
              >
                <h3 className="text-xl font-bold text-cyan-700 dark:text-cyan-300 mb-4 text-center">
                  Work Details
                </h3>
                <input
                  name="servingHospital"
                  placeholder="Primary Hospital (optional)"
                  value={form.servingHospital}
                  onChange={handleChange}
                  className={inputClass}
                />
                <input
                  name="experienceYears"
                  type="number"
                  placeholder="Years of Experience"
                  value={form.experienceYears}
                  onChange={handleChange}
                  className={inputClass}
                  required
                  min="0"
                />
                <select
                  name="shiftAvailability"
                  value={form.shiftAvailability}
                  onChange={handleChange}
                  className={inputClass}
                  required
                >
                  <option value="">Select Shift</option>
                  <option value="Day">Day</option>
                  <option value="Night">Night</option>
                  <option value="Rotational">Rotational</option>
                </select>
                <div className="flex gap-3 mt-2">
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
