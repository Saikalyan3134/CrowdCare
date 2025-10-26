import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import {
  ref,
  push,
  update,
  remove,
  onValue,
} from "firebase/database";

export default function HospitalManager() {
  const [hospitals, setHospitals] = useState({});
  const [form, setForm] = useState({
    name: "",
    address: "",
    contactNumber: "",
    totalBeds: "",
    editingKey: null,
  });

  useEffect(() => {
    const hospitalsRef = ref(db, "hospitals");
    return onValue(hospitalsRef, (snapshot) => {
      setHospitals(snapshot.val() || {});
    });
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.editingKey) {
      update(ref(db, `hospitals/${form.editingKey}`), {
        name: form.name,
        address: form.address,
        contactNumber: form.contactNumber,
        totalBeds: form.totalBeds,
      });
    } else {
      push(ref(db, "hospitals"), {
        name: form.name,
        address: form.address,
        contactNumber: form.contactNumber,
        totalBeds: form.totalBeds,
      });
    }
    setForm({
      name: "",
      address: "",
      contactNumber: "",
      totalBeds: "",
      editingKey: null,
    });
  };

  const handleEdit = (key) => {
    const hospital = hospitals[key];
    setForm({
      name: hospital.name,
      address: hospital.address,
      contactNumber: hospital.contactNumber,
      totalBeds: hospital.totalBeds,
      editingKey: key,
    });
  };

  const handleDelete = (key) => {
    remove(ref(db, `hospitals/${key}`));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-blue-100 via-cyan-200 to-teal-100 dark:from-blue-950 dark:via-cyan-900 dark:to-teal-950 transition-colors">
      <div className="max-w-2xl w-full p-8 md:p-12 rounded-2xl shadow-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-cyan-100 dark:border-cyan-900 ring-1 ring-cyan-100 dark:ring-cyan-900">
        <h2 className="text-3xl font-black text-cyan-700 dark:text-cyan-200 text-center mb-10 drop-shadow">Hospital Management System</h2>

        <form onSubmit={handleSubmit} className="space-y-5 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="name"
              placeholder="Hospital Name"
              className="w-full px-4 py-2 border-2 border-cyan-400 dark:border-cyan-700 bg-cyan-50 dark:bg-zinc-800 text-gray-900 dark:text-cyan-50 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-400 transition"
              value={form.name}
              onChange={handleChange}
              required
            />
            <input
              name="contactNumber"
              placeholder="Contact Number"
              className="w-full px-4 py-2 border-2 border-cyan-400 dark:border-cyan-700 bg-cyan-50 dark:bg-zinc-800 text-gray-900 dark:text-cyan-50 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-400 transition"
              value={form.contactNumber}
              onChange={handleChange}
              required
            />
          </div>
          <input
            name="address"
            placeholder="Hospital Address"
            className="w-full px-4 py-2 border-2 border-cyan-400 dark:border-cyan-700 bg-cyan-50 dark:bg-zinc-800 text-gray-900 dark:text-cyan-50 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-400 transition"
            value={form.address}
            onChange={handleChange}
            required
          />
          <input
            name="totalBeds"
            type="number"
            min="0"
            placeholder="Total Beds"
            className="w-full px-4 py-2 border-2 border-cyan-400 dark:border-cyan-700 bg-cyan-50 dark:bg-zinc-800 text-gray-900 dark:text-cyan-50 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-400 transition"
            value={form.totalBeds}
            onChange={handleChange}
            required
          />

          <div className="flex gap-2">
            <button
              className="px-6 py-2 bg-cyan-600 hover:bg-teal-500 text-white rounded-lg font-semibold shadow-lg transition-all"
              type="submit"
            >
              {form.editingKey ? "Update Hospital" : "Add Hospital"}
            </button>
            {form.editingKey && (
              <button
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition"
                type="button"
                onClick={() =>
                  setForm({
                    name: "",
                    address: "",
                    contactNumber: "",
                    totalBeds: "",
                    editingKey: null,
                  })
                }
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>

        <h3 className="text-2xl font-bold text-cyan-600 dark:text-cyan-300 mb-5">Hospital List</h3>
        <div className="space-y-3">
          {Object.entries(hospitals).map(([key, hospital]) => (
            <div
              key={key}
              className="bg-white/90 dark:bg-zinc-900/80 p-5 rounded-lg border border-cyan-100 dark:border-cyan-900 flex items-center justify-between shadow transition hover:scale-105 hover:border-cyan-400"
            >
              <div className="flex-1">
                <h4 className="font-semibold text-lg text-cyan-800 dark:text-cyan-100">{hospital.name}</h4>
                <p className="text-gray-700 dark:text-gray-200 mt-1">{hospital.address}</p>
                <div className="flex gap-6 mt-2 text-md">
                  <span className="flex items-center gap-2 text-cyan-600 dark:text-cyan-300">
                    <span role="img" aria-label="call">📞</span>{hospital.contactNumber}
                  </span>
                  <span className="flex items-center gap-2 text-teal-700 dark:text-teal-300">
                    <span role="img" aria-label="bed">🛏️</span>{hospital.totalBeds} beds
                  </span>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  className="px-4 py-2 bg-yellow-400 font-semibold text-gray-900 rounded-md hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition text-sm"
                  onClick={() => handleEdit(key)}
                >
                  Edit
                </button>
                <button
                  className="px-4 py-2 bg-red-500 font-semibold text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition text-sm"
                  onClick={() => handleDelete(key)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {Object.keys(hospitals).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg">No hospitals added yet.</p>
              <p className="text-sm mt-1">Add your first hospital using the form above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
