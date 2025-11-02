import React, { useEffect, useState } from "react";
import HospitalSidebar from "../components/HospitalSidebar";
import { ref, onValue, off, update, get } from "firebase/database";
import { db, auth } from "../firebase/firebase";
import { motion } from "framer-motion";
import { onAuthStateChanged } from "firebase/auth";

export default function HospitalManage() {
  const [uid, setUid] = useState(null);
  const [hospital, setHospital] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const [editForm, setEditForm] = useState({
    bedsTotal: 0,
    icuTotal: 0,
    operatingFacilities: "",
    doctorCount: 0,
    nurseCount: 0,
    emergencyAvailable: false,
  });

  // Get auth user and hospital data
  useEffect(() => {
    const sub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      setUid(u.uid);
      const hs = await get(ref(db, `hospitals/${u.uid}`));
      if (hs.exists()) {
        const data = hs.val();
        setHospital(data);
        setEditForm({
          bedsTotal: data.capacity?.bedsTotal || 0,
          icuTotal: data.capacity?.icuTotal || 0,
          operatingFacilities: data.resources?.operatingFacilities || "",
          doctorCount: data.staff?.doctorCount || 0,
          nurseCount: data.staff?.nurseCount || 0,
          emergencyAvailable: data.resources?.emergencyAvailable || false,
        });
      }
    });
    return () => sub();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!uid) return;
    const r = ref(db, `hospitals/${uid}`);
    const h = onValue(r, (snap) => {
      if (snap.exists()) {
        setHospital(snap.val());
      }
    });
    return () => off(r, "value", h);
  }, [uid]);

  const handleEditChange = (e) => {
    const { name, value, type } = e.target;
    setEditForm({
      ...editForm,
      [name]: type === "checkbox" ? !editForm[name] : 
              name === "bedsTotal" || name === "icuTotal" || 
              name === "doctorCount" || name === "nurseCount" 
              ? Math.max(0, Number(value))
              : value,
    });
  };

  const handleSave = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      await update(ref(db, `hospitals/${uid}`), {
        capacity: {
          bedsTotal: editForm.bedsTotal,
          icuTotal: editForm.icuTotal,
        },
        resources: {
          emergencyAvailable: editForm.emergencyAvailable,
          operatingFacilities: editForm.operatingFacilities.trim(),
        },
        staff: {
          doctorCount: editForm.doctorCount,
          nurseCount: editForm.nurseCount,
        },
        updatedAt: Date.now(),
      });
      setMessage("✅ Hospital settings updated successfully!");
      setMessageType("success");
      setEditMode(false);
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
      setMessageType("error");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  if (!hospital) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-cyan-200 to-teal-100 dark:from-blue-950 dark:via-cyan-900 dark:to-teal-950 flex items-center justify-center">
        <div className="text-cyan-900 dark:text-cyan-100 text-lg font-semibold">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-cyan-200 to-teal-100 dark:from-blue-950 dark:via-cyan-900 dark:to-teal-950">
      <div className="flex">
        <HospitalSidebar />
        <main className="flex-1 min-w-0">
          {/* Top bar */}
          <div
            className="h-16 sticky top-0 z-20
                          bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md
                          border-b border-white/10 dark:border-white/10"
          >
            <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
              <h1 className="text-xl md:text-2xl font-extrabold text-cyan-800 dark:text-cyan-100">
                Manage Hospital
              </h1>
              <button
                onClick={() => (editMode ? handleSave() : setEditMode(true))}
                disabled={loading}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  editMode
                    ? "bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white"
                    : "bg-cyan-600 hover:bg-cyan-700 text-white"
                }`}
              >
                {loading ? "Saving..." : editMode ? "Save Changes" : "Edit"}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl text-center font-semibold ${
                  messageType === "success"
                    ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                    : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                }`}
              >
                {message}
              </motion.div>
            )}

            {/* Hospital Info */}
            <div className="rounded-2xl p-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md ring-1 ring-cyan-100 dark:ring-cyan-900">
              <h2 className="text-2xl font-bold text-cyan-700 dark:text-cyan-300 mb-4">
                Hospital Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-cyan-800/70 dark:text-cyan-200/70">Hospital Name</p>
                  <p className="text-lg font-bold text-cyan-900 dark:text-cyan-50">
                    {hospital.profile?.name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-cyan-800/70 dark:text-cyan-200/70">License No.</p>
                  <p className="text-lg font-bold text-cyan-900 dark:text-cyan-50">
                    {hospital.profile?.licenceNo || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-cyan-800/70 dark:text-cyan-200/70">Email</p>
                  <p className="text-lg font-bold text-cyan-900 dark:text-cyan-50">
                    {hospital.contact?.email || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-cyan-800/70 dark:text-cyan-200/70">Address</p>
                  <p className="text-lg font-bold text-cyan-900 dark:text-cyan-50">
                    {hospital.location?.address || "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Current Stats */}
            {!editMode && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Beds Occupied", value: hospital.stats?.bedsOccupied || 0 },
                  { label: "ICU Occupied", value: hospital.stats?.icuOccupied || 0 },
                  { label: "Total Patients", value: hospital.stats?.admittedCount || 0 },
                  { label: "Active Inflow", value: hospital.stats?.inflowActive || 0 },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="rounded-2xl p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md ring-1 ring-cyan-100 dark:ring-cyan-900"
                  >
                    <p className="text-sm text-cyan-800/70 dark:text-cyan-200/70">{stat.label}</p>
                    <p className="text-2xl font-extrabold text-cyan-700 dark:text-cyan-100">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Capacity Management */}
            <motion.div
              layout
              className="rounded-2xl p-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md ring-1 ring-cyan-100 dark:ring-cyan-900"
            >
              <h2 className="text-2xl font-bold text-cyan-700 dark:text-cyan-300 mb-6">
                Capacity Management
              </h2>

              {editMode ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-cyan-800 dark:text-cyan-200 mb-2">
                        Total Beds
                      </label>
                      <input
                        type="number"
                        name="bedsTotal"
                        value={editForm.bedsTotal}
                        onChange={handleEditChange}
                        min="0"
                        className="w-full px-4 py-3 border-2 border-cyan-400 dark:border-cyan-700 bg-cyan-50 dark:bg-zinc-800 text-gray-900 dark:text-cyan-50 rounded-lg focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-cyan-800 dark:text-cyan-200 mb-2">
                        Total ICU Beds
                      </label>
                      <input
                        type="number"
                        name="icuTotal"
                        value={editForm.icuTotal}
                        onChange={handleEditChange}
                        min="0"
                        className="w-full px-4 py-3 border-2 border-cyan-400 dark:border-cyan-700 bg-cyan-50 dark:bg-zinc-800 text-gray-900 dark:text-cyan-50 rounded-lg focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  {/* Current vs Total */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-cyan-200 dark:border-cyan-800">
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 p-4 rounded-lg">
                      <p className="text-sm text-cyan-800/70 dark:text-cyan-200/70">Beds Occupied</p>
                      <p className="text-xl font-bold text-cyan-700 dark:text-cyan-100">
                        {hospital.stats?.bedsOccupied || 0} / {editForm.bedsTotal}
                      </p>
                      <div className="mt-2 bg-white dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full"
                          style={{
                            width: `${
                              editForm.bedsTotal > 0
                                ? Math.round(((hospital.stats?.bedsOccupied || 0) / editForm.bedsTotal) * 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 p-4 rounded-lg">
                      <p className="text-sm text-cyan-800/70 dark:text-cyan-200/70">ICU Occupied</p>
                      <p className="text-xl font-bold text-cyan-700 dark:text-cyan-100">
                        {hospital.stats?.icuOccupied || 0} / {editForm.icuTotal}
                      </p>
                      <div className="mt-2 bg-white dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-full"
                          style={{
                            width: `${
                              editForm.icuTotal > 0
                                ? Math.round(((hospital.stats?.icuOccupied || 0) / editForm.icuTotal) * 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 p-4 rounded-lg">
                    <p className="text-sm text-cyan-800/70 dark:text-cyan-200/70">Regular Beds</p>
                    <p className="text-xl font-bold text-cyan-700 dark:text-cyan-100">
                      {hospital.capacity?.bedsTotal || 0} Available
                    </p>
                    <p className="text-sm text-cyan-800/60 dark:text-cyan-200/60 mt-1">
                      {hospital.stats?.bedsOccupied || 0} Currently Occupied
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 p-4 rounded-lg">
                    <p className="text-sm text-cyan-800/70 dark:text-cyan-200/70">ICU Beds</p>
                    <p className="text-xl font-bold text-cyan-700 dark:text-cyan-100">
                      {hospital.capacity?.icuTotal || 0} Available
                    </p>
                    <p className="text-sm text-cyan-800/60 dark:text-cyan-200/60 mt-1">
                      {hospital.stats?.icuOccupied || 0} Currently Occupied
                    </p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Facilities & Staff */}
            <motion.div
              layout
              className="rounded-2xl p-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md ring-1 ring-cyan-100 dark:ring-cyan-900"
            >
              <h2 className="text-2xl font-bold text-cyan-700 dark:text-cyan-300 mb-6">
                Facilities & Staff
              </h2>

              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-cyan-800 dark:text-cyan-200 mb-2">
                      Operating Facilities
                    </label>
                    <input
                      type="text"
                      name="operatingFacilities"
                      value={editForm.operatingFacilities}
                      onChange={handleEditChange}
                      placeholder="e.g., ICU, Surgery, Emergency, Cardiology"
                      className="w-full px-4 py-3 border-2 border-cyan-400 dark:border-cyan-700 bg-cyan-50 dark:bg-zinc-800 text-gray-900 dark:text-cyan-50 rounded-lg focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-cyan-800 dark:text-cyan-200 mb-2">
                        Number of Doctors
                      </label>
                      <input
                        type="number"
                        name="doctorCount"
                        value={editForm.doctorCount}
                        onChange={handleEditChange}
                        min="0"
                        className="w-full px-4 py-3 border-2 border-cyan-400 dark:border-cyan-700 bg-cyan-50 dark:bg-zinc-800 text-gray-900 dark:text-cyan-50 rounded-lg focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-cyan-800 dark:text-cyan-200 mb-2">
                        Number of Nurses
                      </label>
                      <input
                        type="number"
                        name="nurseCount"
                        value={editForm.nurseCount}
                        onChange={handleEditChange}
                        min="0"
                        className="w-full px-4 py-3 border-2 border-cyan-400 dark:border-cyan-700 bg-cyan-50 dark:bg-zinc-800 text-gray-900 dark:text-cyan-50 rounded-lg focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg">
                    <input
                      type="checkbox"
                      name="emergencyAvailable"
                      checked={editForm.emergencyAvailable}
                      onChange={handleEditChange}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <label className="text-sm font-semibold text-cyan-800 dark:text-cyan-200 cursor-pointer">
                      Emergency Services Available
                    </label>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 p-4 rounded-lg">
                    <p className="text-sm text-cyan-800/70 dark:text-cyan-200/70">Operating Facilities</p>
                    <p className="text-lg font-bold text-cyan-900 dark:text-cyan-50">
                      {hospital.resources?.operatingFacilities || "—"}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30 p-4 rounded-lg">
                    <p className="text-sm text-cyan-800/70 dark:text-cyan-200/70">Emergency Services</p>
                    <p className="text-lg font-bold text-cyan-900 dark:text-cyan-50">
                      {hospital.resources?.emergencyAvailable ? "✅ Available" : "❌ Not Available"}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 p-4 rounded-lg">
                    <p className="text-sm text-cyan-800/70 dark:text-cyan-200/70">Doctors</p>
                    <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-100">
                      {hospital.staff?.doctorCount || 0}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/30 dark:to-rose-900/30 p-4 rounded-lg">
                    <p className="text-sm text-cyan-800/70 dark:text-cyan-200/70">Nurses</p>
                    <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-100">
                      {hospital.staff?.nurseCount || 0}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Contact Information */}
            <div className="rounded-2xl p-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md ring-1 ring-cyan-100 dark:ring-cyan-900">
              <h2 className="text-2xl font-bold text-cyan-700 dark:text-cyan-300 mb-4">
                Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-cyan-800/70 dark:text-cyan-200/70">Contact Person</p>
                  <p className="text-lg font-bold text-cyan-900 dark:text-cyan-50">
                    {hospital.contact?.person || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-cyan-800/70 dark:text-cyan-200/70">Contact Email</p>
                  <p className="text-lg font-bold text-cyan-900 dark:text-cyan-50">
                    {hospital.contact?.personEmail || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-cyan-800/70 dark:text-cyan-200/70">Contact Phone</p>
                  <p className="text-lg font-bold text-cyan-900 dark:text-cyan-50">
                    {hospital.contact?.phone || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
