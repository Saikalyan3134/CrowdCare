import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";
import { db } from "../firebase/firebase";

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
    emergencyAvailable: "",
    operatingFacilities: "",
    doctorCount: "",
    nurseCount: "",
  });

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm({
      ...form,
      [name]: type === "radio" ? (value === "yes" ? true : false) : value,
    });
  };

  const nextSection = () => setStep((s) => Math.min(s + 1, 3));
  const prevSection = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    try {
      const auth = getAuth();
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await set(ref(db, "hospitals/" + cred.user.uid), {
        hospital: {
          name: form.name,
          email: form.email,
          license: form.license,
          address: form.address,
        },
        contact: {
          contactPerson: form.contactPerson,
          contactPersonEmail: form.contactPersonEmail,
          contactPersonPhone: form.contactPersonPhone,
        },
        stats: {
          beds: form.beds,
          emergencyAvailable: form.emergencyAvailable,
          operatingFacilities: form.operatingFacilities,
          doctorCount: form.doctorCount,
          nurseCount: form.nurseCount,
        },
        uid: cred.user.uid,
      });
      setSuccess("✅ Registration successful! Redirecting to login...");
      setForm({
        name: "", email: "", license: "", address: "", password: "",
        contactPerson: "", contactPersonEmail: "", contactPersonPhone: "",
        beds: "", emergencyAvailable: "", operatingFacilities: "",
        doctorCount: "", nurseCount: ""
      });
      setStep(1);
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError("⚠️ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Stepper component
  const Stepper = () => (
    <div className="flex items-center justify-center gap-10 mb-10">
      {["Hospital", "Contact", "Capacity"].map((label, index) => {
        const num = index + 1;
        return (
          <div key={num} className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white
              ${step === num ? "bg-black-600 shadow-lg outline outline-cyan-400" : "bg-cyan-400/70"}`}
            >
              <button type="button" onClick={() => setStep(num)} className="w-full h-full">{num}</button>
            </div>
            <span
              className={`mt-2 text-sm font-semibold ${
                step === num ? "text-cyan-700 dark:text-cyan-300" : "text-cyan-500 dark:text-cyan-400"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );

  const inputClass =
    "w-full px-4 py-3 border-2 border-cyan-400 dark:border-cyan-700 bg-cyan-50 dark:bg-zinc-800 text-gray-900 dark:text-cyan-50 rounded-lg shadow-sm focus:ring-2 focus:ring-cyan-400 transition mb-4";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-blue-100 via-cyan-200 to-teal-100 dark:from-blue-950 dark:via-cyan-900 dark:to-teal-950 transition-colors">
      <div className="max-w-2xl w-full p-8 md:p-12 rounded-2xl shadow-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-cyan-100 dark:border-cyan-900 ring-1 ring-cyan-100 dark:ring-cyan-900">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-black text-cyan-700 dark:text-cyan-200 mb-2 drop-shadow">
            Hospital Registration
          </h2>
          <button 
            onClick={() => navigate('/login')}
            className="text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-200 underline"
          >
            ← Back to Login
          </button>
        </div>

        <Stepper />

        {success && (
          <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 p-3 rounded-md mb-4 text-center">
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-3 rounded-md mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1 */}
          {step === 1 && (
            <>
              <h3 className="text-xl font-bold text-cyan-700 dark:text-cyan-300 mb-4 text-center">
                Hospital Details
              </h3>
              <input name="name" placeholder="Hospital Name" value={form.name} onChange={handleChange} className={inputClass} required />
              <input name="email" type="email" placeholder="Official Email" value={form.email} onChange={handleChange} className={inputClass} required />
              <input name="license" placeholder="License / Registration No." value={form.license} onChange={handleChange} className={inputClass} required />
              <input name="address" placeholder="Hospital Address" value={form.address} onChange={handleChange} className={inputClass} required />
              <input name="password" type="password" placeholder="Set Password (min 8 chars)" value={form.password} onChange={handleChange} className={inputClass} required minLength={8} />
            <input name="confirmPassword" type="password" placeholder="Confirm Password" value={form.confirmPassword} onChange={handleChange} className={inputClass} required minLength={8} />
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={nextSection}
                  className="px-6 py-2 bg-cyan-600 hover:bg-teal-500 text-white rounded-lg font-semibold shadow-lg transition-all"
                >
                  Next →
                </button>
              </div>
            </>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <>
              <h3 className="text-xl font-bold text-cyan-700 dark:text-cyan-300 mb-4 text-center">
                Contact Person Details
              </h3>
              <input name="contactPerson" placeholder="Contact Person Name" value={form.contactPerson} onChange={handleChange} className={inputClass} required />
              <input name="contactPersonEmail" type="email" placeholder="Contact Email" value={form.contactPersonEmail} onChange={handleChange} className={inputClass} required />
              <input name="contactPersonPhone" type="tel" placeholder="Contact Phone Number" value={form.contactPersonPhone} onChange={handleChange} className={inputClass} required />

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
            </>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <>
              <h3 className="text-xl font-bold text-cyan-700 dark:text-cyan-300 mb-4 text-center">
                Capacity & Facilities
              </h3>
              <input name="beds" type="number" placeholder="Total Beds" value={form.beds} onChange={handleChange} className={inputClass} required />
              <label className="block font-semibold text-cyan-700 dark:text-cyan-300 mb-2">Emergency Services Available?</label>
              <div className="flex gap-8 mb-4">
                <label className="flex items-center gap-2 text-gray-800 dark:text-cyan-50">
                  <input type="radio" name="emergencyAvailable" value="yes" checked={form.emergencyAvailable === true} onChange={handleChange} />
                  Yes
                </label>
                <label className="flex items-center gap-2 text-gray-800 dark:text-cyan-50">
                  <input type="radio" name="emergencyAvailable" value="no" checked={form.emergencyAvailable === false} onChange={handleChange} />
                  No
                </label>
              </div>
              <input name="operatingFacilities" placeholder="Operating Facilities (e.g. ICU, Surgery)" value={form.operatingFacilities} onChange={handleChange} className={inputClass} required />
              <input name="doctorCount" type="number" placeholder="Number of Doctors" value={form.doctorCount} onChange={handleChange} className={inputClass} required />
              <input name="nurseCount" type="number" placeholder="Number of Nurses" value={form.nurseCount} onChange={handleChange} className={inputClass} required />

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
                  className="px-6 py-2 bg-green-600 hover:bg-teal-600 text-white rounded-lg font-semibold shadow-lg transition-all"
                >
                  {loading ? "Registering..." : "Register"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
