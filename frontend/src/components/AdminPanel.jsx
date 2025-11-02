import React, { useState } from "react";
import { auth } from "../firebase/firebase";
import { admitPatient, dischargePatient } from "../utils/hospitalApi";

export default function AdminPanel() {
  const [admissionId, setAdmissionId] = useState("");
  const [type, setType] = useState("WARD");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleAdmit = async () => {
    if (!admissionId) {
      setMessage("Enter admission ID");
      return;
    }
    setLoading(true);
    try {
      const res = await admitPatient(auth.currentUser.uid, admissionId, type);
      if (res.ok) {
        setMessage(`✅ Patient admitted (${type})`);
        setAdmissionId("");
      } else {
        setMessage(`❌ ${res.error}`);
      }
    } catch (e) {
      setMessage(`❌ Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDischarge = async () => {
    if (!admissionId) {
      setMessage("Enter admission ID");
      return;
    }
    setLoading(true);
    try {
      const res = await dischargePatient(auth.currentUser.uid, admissionId, type);
      if (res.ok) {
        setMessage(`✅ Patient discharged (${type})`);
        setAdmissionId("");
      } else {
        setMessage(`❌ ${res.error}`);
      }
    } catch (e) {
      setMessage(`❌ Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white/80 dark:bg-zinc-900/80 rounded-2xl ring-1 ring-cyan-100 dark:ring-cyan-900">
      <h3 className="text-lg font-bold text-cyan-700 dark:text-cyan-300 mb-4">
        Test: Admit / Discharge Patient
      </h3>

      <input
        type="text"
        placeholder="Admission ID"
        value={admissionId}
        onChange={(e) => setAdmissionId(e.target.value)}
        className="w-full px-4 py-2 border-2 border-cyan-400 rounded-lg mb-3"
      />

      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="w-full px-4 py-2 border-2 border-cyan-400 rounded-lg mb-4"
      >
        <option value="WARD">WARD</option>
        <option value="ICU">ICU</option>
      </select>

      <div className="flex gap-3 mb-3">
        <button
          onClick={handleAdmit}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
        >
          {loading ? "Processing..." : "Admit"}
        </button>
        <button
          onClick={handleDischarge}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
        >
          {loading ? "Processing..." : "Discharge"}
        </button>
      </div>

      {message && (
        <div className="text-center text-sm font-semibold text-cyan-700 dark:text-cyan-300">
          {message}
        </div>
      )}
    </div>
  );
}
