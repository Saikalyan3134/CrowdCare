import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ref, onValue, off, set, update, remove } from "firebase/database";
import { db, auth } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { HiPlus, HiTrash, HiEye, HiArrowLeftOnRectangle } from "react-icons/hi2";
import HospitalSidebar from "../components/HospitalSidebar"; // Your existing sidebar component

export default function PatientManagement() {
  const navigate = useNavigate();

  const [uid, setUid] = useState(null);
  const [patients, setPatients] = useState([]);
  const [hospitalCapacity, setHospitalCapacity] = useState({ bedsTotal: 0, icuTotal: 0 });
  const [hospitalStats, setHospitalStats] = useState({ bedsOccupied: 0, icuOccupied: 0 });

  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [message, setMessage] = useState("");
  const [sortBy, setSortBy] = useState("admittedTime");

  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    phone: "",
    address: "",
    diagnosis: "",
    bedType: "",
    notes: "",
  });

  // Auth - Get current hospital UID
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

  // Fetch hospital capacity (real-time) - read from full hospital object like HospitalManage
  useEffect(() => {
    if (!uid) return;
    const r = ref(db, `hospitals/${uid}`);
    const h = onValue(r, (snap) => {
      const hospitalData = snap.val();
      if (hospitalData && hospitalData.capacity) {
        setHospitalCapacity({
          bedsTotal: hospitalData.capacity.bedsTotal || 0,
          icuTotal: hospitalData.capacity.icuTotal || 0,
        });
      }
    });
    return () => off(r, "value", h);
  }, [uid]);

  // Fetch hospital stats (real-time)
  useEffect(() => {
    if (!uid) return;
    const r = ref(db, `hospitals/${uid}/stats`);
    const h = onValue(r, (snap) => {
      const data = snap.val();
      if (data) setHospitalStats(data);
    });
    return () => off(r, "value", h);
  }, [uid]);

  // Fetch patients (real-time updates)
  useEffect(() => {
    if (!uid) return;
    const r = ref(db, `hospitals/${uid}/patients`);
    const h = onValue(r, (snap) => {
      const data = snap.val();
      if (data) {
        const patientList = Object.entries(data).map(([id, patient]) => ({
          id,
          ...patient,
        }));
        setPatients(patientList);
      } else {
        setPatients([]);
      }
    });
    return () => off(r, "value", h);
  }, [uid]);

  // Sorted patients
  const sortedPatients = useMemo(() => {
    let sorted = [...patients];

    if (sortBy === "admittedTime") {
      sorted.sort((a, b) => (b.admittedAt || 0) - (a.admittedAt || 0));
    } else if (sortBy === "name") {
      sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortBy === "bedType") {
      sorted.sort((a, b) => (a.bedType || "").localeCompare(b.bedType || ""));
    }

    return sorted;
  }, [patients, sortBy]);

  // Admit patient
  const handleAdmitPatient = async () => {
    if (!uid || !formData.name || !formData.age || !formData.diagnosis || !formData.gender || !formData.bedType) {
      setMessage("❌ Please fill all required fields");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    try {
      const bedsAvail = (hospitalCapacity.bedsTotal || 0) - (hospitalStats.bedsOccupied || 0);
      const icuAvail = (hospitalCapacity.icuTotal || 0) - (hospitalStats.icuOccupied || 0);

      if (formData.bedType === "General" && bedsAvail <= 0) {
        setMessage("❌ No general beds available");
        setTimeout(() => setMessage(""), 3000);
        return;
      }
      if (formData.bedType === "ICU" && icuAvail <= 0) {
        setMessage("❌ No ICU beds available");
        setTimeout(() => setMessage(""), 3000);
        return;
      }

      const patientId = Date.now().toString();
      const patientData = {
        ...formData,
        admittedAt: Date.now(),
        status: "admitted",
      };

      await set(ref(db, `hospitals/${uid}/patients/${patientId}`), patientData);

      const newBedsOccupied =
        (hospitalStats.bedsOccupied || 0) + (formData.bedType === "General" ? 1 : 0);
      const newIcuOccupied =
        (hospitalStats.icuOccupied || 0) + (formData.bedType === "ICU" ? 1 : 0);

      await update(ref(db, `hospitals/${uid}/stats`), {
        bedsOccupied: newBedsOccupied,
        icuOccupied: newIcuOccupied,
      });

      setMessage(`✅ Patient ${formData.name} admitted successfully!`);
      setFormData({
        name: "",
        age: "",
        gender: "",
        phone: "",
        address: "",
        diagnosis: "",
        bedType: "",
        notes: "",
      });
      setShowAdmitModal(false);
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error:", error);
      setMessage("❌ Error: " + error.message);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // Discharge patient
  const handleDischargePatient = async (patientId, bedType) => {
    if (!uid) return;

    try {
      await remove(ref(db, `hospitals/${uid}/patients/${patientId}`));

      const newBedsOccupied =
        Math.max(0, (hospitalStats.bedsOccupied || 0) - (bedType === "General" ? 1 : 0));
      const newIcuOccupied =
        Math.max(0, (hospitalStats.icuOccupied || 0) - (bedType === "ICU" ? 1 : 0));

      await update(ref(db, `hospitals/${uid}/stats`), {
        bedsOccupied: newBedsOccupied,
        icuOccupied: newIcuOccupied,
      });

      setMessage("✅ Patient discharged successfully!");
      setShowDetailsModal(false);
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error:", error);
      setMessage("❌ Error: " + error.message);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (error) {
      setMessage("❌ Sign out failed");
      setTimeout(() => setMessage(""), 2500);
    }
  };

  const bedsAvail = Math.max((hospitalCapacity.bedsTotal || 0) - (hospitalStats.bedsOccupied || 0), 0);
  const icuAvail = Math.max((hospitalCapacity.icuTotal || 0) - (hospitalStats.icuOccupied || 0), 0);

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
                Patient Management
              </h1>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all"
                title="Sign out"
              >
                <HiArrowLeftOnRectangle className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Toast */}
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl text-center font-semibold ${
                  message.includes("✅")
                    ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                    : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                }`}
              >
                {message}
              </motion.div>
            )}

            {/* Header with Button */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">Patients</h2>
              <button
                onClick={() => setShowAdmitModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg transition"
              >
                <HiPlus className="w-5 h-5" />
                Admit Patient
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md ring-1 ring-cyan-100 dark:ring-cyan-900">
                <p className="text-sm text-cyan-800/70 dark:text-cyan-200/70">Regular Beds</p>
                <p className="text-2xl font-extrabold text-cyan-700 dark:text-cyan-100">
                  {hospitalCapacity.bedsTotal || 0}
                </p>
                <p className="text-xs text-cyan-800/60 dark:text-cyan-200/60 mt-1">
                  {hospitalStats.bedsOccupied || 0} Occupied, {bedsAvail} Available
                </p>
              </div>
              <div className="rounded-2xl p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md ring-1 ring-cyan-100 dark:ring-cyan-900">
                <p className="text-sm text-cyan-800/70 dark:text-cyan-200/70">ICU Beds</p>
                <p className="text-2xl font-extrabold text-cyan-700 dark:text-cyan-100">
                  {hospitalCapacity.icuTotal || 0}
                </p>
                <p className="text-xs text-cyan-800/60 dark:text-cyan-200/60 mt-1">
                  {hospitalStats.icuOccupied || 0} Occupied, {icuAvail} Available
                </p>
              </div>
              <div className="rounded-2xl p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md ring-1 ring-cyan-100 dark:ring-cyan-900">
                <p className="text-sm text-cyan-800/70 dark:text-cyan-200/70">Total Patients</p>
                <p className="text-2xl font-extrabold text-cyan-700 dark:text-cyan-100">{patients.length}</p>
              </div>
              <div className="rounded-2xl p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md ring-1 ring-cyan-100 dark:ring-cyan-900">
                <p className="text-sm text-cyan-800/70 dark:text-cyan-200/70">Total Occupied</p>
                <p className="text-2xl font-extrabold text-cyan-700 dark:text-cyan-100">
                  {(hospitalStats.bedsOccupied || 0) + (hospitalStats.icuOccupied || 0)}
                </p>
              </div>
            </div>

            {/* Sort Controls */}
            <div className="flex gap-2 items-center">
              <label className="text-sm font-semibold text-cyan-800 dark:text-cyan-100">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 rounded border border-cyan-300 dark:border-cyan-700 bg-white dark:bg-zinc-800 text-sm"
              >
                <option value="admittedTime">Admitted Time (Latest First)</option>
                <option value="name">Name (A-Z)</option>
                <option value="bedType">Bed Type</option>
              </select>
            </div>

            {/* Patients Table */}
            <div className="rounded-2xl overflow-hidden bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md ring-1 ring-cyan-100 dark:ring-cyan-900 shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-cyan-600 dark:bg-cyan-900 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Age</th>
                      <th className="px-4 py-3 text-left">Gender</th>
                      <th className="px-4 py-3 text-left">Diagnosis</th>
                      <th className="px-4 py-3 text-left">Bed Type</th>
                      <th className="px-4 py-3 text-left">Admitted</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence mode="popLayout">
                      {sortedPatients.length > 0 ? (
                        sortedPatients.map((patient) => (
                          <motion.tr
                            key={patient.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="border-t border-cyan-100 dark:border-cyan-900 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition"
                          >
                            <td className="px-4 py-3 font-semibold text-cyan-900 dark:text-cyan-100">{patient.name}</td>
                            <td className="px-4 py-3 text-cyan-800 dark:text-cyan-200">{patient.age}</td>
                            <td className="px-4 py-3 text-cyan-800 dark:text-cyan-200">{patient.gender}</td>
                            <td className="px-4 py-3 text-cyan-800 dark:text-cyan-200">{patient.diagnosis}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  patient.bedType === "ICU"
                                    ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                                    : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                                }`}
                              >
                                {patient.bedType}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-cyan-800 dark:text-cyan-200 text-xs">
                              {new Date(patient.admittedAt).toLocaleDateString()} {new Date(patient.admittedAt).toLocaleTimeString()}
                            </td>
                            <td className="px-4 py-3 flex justify-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedPatient(patient);
                                  setShowDetailsModal(true);
                                }}
                                className="p-2 rounded bg-blue-600 hover:bg-blue-700 text-white transition"
                                title="View details"
                              >
                                <HiEye className="w-4 h-4" />
                              </button>
                            </td>
                          </motion.tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="px-4 py-8 text-center text-cyan-800 dark:text-cyan-200">
                            No patients admitted
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Admit Modal */}
      <AnimatePresence>
        {showAdmitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowAdmitModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto backdrop-blur-md"
            >
              <h2 className="text-2xl font-bold text-cyan-800 dark:text-cyan-100 mb-4">Admit Patient</h2>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Patient Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-cyan-300 dark:border-cyan-700 bg-white dark:bg-zinc-800 text-cyan-900 dark:text-cyan-100"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="Age *"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="px-3 py-2 rounded border border-cyan-300 dark:border-cyan-700 bg-white dark:bg-zinc-800 text-cyan-900 dark:text-cyan-100"
                  />
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="px-3 py-2 rounded border border-cyan-300 dark:border-cyan-700 bg-white dark:bg-zinc-800 text-cyan-900 dark:text-cyan-100"
                  >
                    <option value="">-- Select Gender *</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <input
                  type="tel"
                  placeholder="Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-cyan-300 dark:border-cyan-700 bg-white dark:bg-zinc-800 text-cyan-900 dark:text-cyan-100"
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-cyan-300 dark:border-cyan-700 bg-white dark:bg-zinc-800 text-cyan-900 dark:text-cyan-100"
                />
                <input
                  type="text"
                  placeholder="Diagnosis *"
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-cyan-300 dark:border-cyan-700 bg-white dark:bg-zinc-800 text-cyan-900 dark:text-cyan-100"
                />
                <select
                  value={formData.bedType}
                  onChange={(e) => setFormData({ ...formData, bedType: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-cyan-300 dark:border-cyan-700 bg-white dark:bg-zinc-800 text-cyan-900 dark:text-cyan-100"
                >
                  <option value="">-- Select Bed Type *</option>
                  <option value="General">General Bed</option>
                  <option value="ICU">ICU Bed</option>
                </select>
                <textarea
                  placeholder="Notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-cyan-300 dark:border-cyan-700 bg-white dark:bg-zinc-800 text-cyan-900 dark:text-cyan-100 h-20"
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleAdmitPatient}
                  className="flex-1 px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-semibold transition"
                >
                  Admit
                </button>
                <button
                  onClick={() => setShowAdmitModal(false)}
                  className="flex-1 px-4 py-2 rounded bg-gray-500 hover:bg-gray-600 text-white font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Patient Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedPatient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowDetailsModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 backdrop-blur-md"
            >
              <h2 className="text-2xl font-bold text-cyan-800 dark:text-cyan-100 mb-4">{selectedPatient.name}</h2>
              <div className="space-y-2 mb-4 text-sm">
                <p className="text-cyan-800 dark:text-cyan-200"><span className="font-semibold">Age:</span> {selectedPatient.age}</p>
                <p className="text-cyan-800 dark:text-cyan-200"><span className="font-semibold">Gender:</span> {selectedPatient.gender}</p>
                <p className="text-cyan-800 dark:text-cyan-200"><span className="font-semibold">Phone:</span> {selectedPatient.phone || "—"}</p>
                <p className="text-cyan-800 dark:text-cyan-200"><span className="font-semibold">Address:</span> {selectedPatient.address || "—"}</p>
                <p className="text-cyan-800 dark:text-cyan-200"><span className="font-semibold">Diagnosis:</span> {selectedPatient.diagnosis}</p>
                <p className="text-cyan-800 dark:text-cyan-200">
                  <span className="font-semibold">Bed Type:</span> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                    selectedPatient.bedType === "ICU"
                      ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                      : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                  }`}>
                    {selectedPatient.bedType}
                  </span>
                </p>
                <p className="text-cyan-800 dark:text-cyan-200"><span className="font-semibold">Admitted:</span> {new Date(selectedPatient.admittedAt).toLocaleString()}</p>
                <p className="text-cyan-800 dark:text-cyan-200"><span className="font-semibold">Notes:</span> {selectedPatient.notes || "—"}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDischargePatient(selectedPatient.id, selectedPatient.bedType)}
                  className="flex-1 px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center justify-center gap-2 transition"
                >
                  <HiTrash className="w-4 h-4" />
                  Discharge
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="flex-1 px-4 py-2 rounded bg-gray-500 hover:bg-gray-600 text-white font-semibold transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
