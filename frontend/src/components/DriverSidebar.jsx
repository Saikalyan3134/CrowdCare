// src/components/DriverSidebar.jsx
import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { HiOutlineBars3, HiMapPin, HiHome, HiBell, HiClock, HiCog6Tooth, HiQuestionMarkCircle, HiArrowLeftOnRectangle, HiCheckCircle, HiXCircle } from "react-icons/hi2";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, update } from "firebase/database";

export default function DriverSidebar({
  onUpdateLocation = () => {},
  showHospitals = true,
}) {
  const [open, setOpen] = useState(true);
  const [uid, setUid] = useState(null);
  const [status, setStatus] = useState("available");
  const navigate = useNavigate();

  useEffect(() => {
    const sub = onAuthStateChanged(auth, (u) => {
      if (u) setUid(u.uid);
    });
    return () => sub();
  }, []);

  const toggleStatus = async () => {
    const next = status === "available" ? "busy" : "available";
    setStatus(next);
    if (uid) {
      try {
        await update(ref(db, `drivers/${uid}`), { status: next, updatedAt: Date.now() });
      } catch (e) {
        console.warn("Status update failed:", e?.message);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (e) {
      console.warn("Sign out failed:", e?.message);
    }
  };

  const linkBase =
    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors";
  const linkActive =
    "bg-teal-600 text-white";
  const linkIdle =
    "text-teal-900 dark:text-teal-100 hover:bg-teal-600/10 dark:hover:bg-teal-600/20";

  return (
    <aside
      className={`${
        open ? "w-64" : "w-16"
      } sticky top-0 h-screen shrink-0 transition-all duration-300 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border-r border-white/10 dark:border-white/10`}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-3">
        <button
          onClick={() => setOpen((s) => !s)}
          className="p-2 rounded-lg hover:bg-teal-600/10 dark:hover:bg-teal-600/20"
          title="Toggle sidebar"
        >
          <HiOutlineBars3 className="w-6 h-6 text-teal-700 dark:text-teal-100" />
        </button>
        {open && (
          <div className="text-teal-800 dark:text-teal-100 font-extrabold tracking-tight">
            Driver Hub
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-3 space-y-2">
        {/* Status toggle */}
        <button
          onClick={toggleStatus}
          className={`w-full ${linkBase} ${status === "available" ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"}`}
          title="Toggle availability"
        >
          {status === "available" ? (
            <HiCheckCircle className="w-5 h-5" />
          ) : (
            <HiXCircle className="w-5 h-5" />
          )}
          {open && <span>Status: {status === "available" ? "Available" : "Busy"}</span>}
        </button>

        {/* Update location */}
        <button
          onClick={onUpdateLocation}
          className={`w-full ${linkBase} ${linkIdle}`}
          title="Update live location"
        >
          <HiMapPin className="w-5 h-5" />
          {open && <span>Update Location</span>}
        </button>
      </div>

      {/* Nav */}
      <nav className="mt-3 px-3 space-y-1">
        <NavLink
          to="/driver/dashboard"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : linkIdle}`
          }
        >
          <HiHome className="w-5 h-5" />
          {open && <span>Dashboard</span>}
        </NavLink>

        {showHospitals && (
          <NavLink
            to="/driver/hospitals"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkIdle}`
            }
          >
            <HiBell className="w-5 h-5" />
            {open && <span>Hospitals</span>}
          </NavLink>
        )}

        <NavLink
          to="/driver/history"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : linkIdle}`
          }
        >
          <HiClock className="w-5 h-5" />
          {open && <span>History</span>}
        </NavLink>

        <NavLink
          to="/driver/settings"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? linkActive : linkIdle}`
          }
        >
          <HiCog6Tooth className="w-5 h-5" />
          {open && <span>Settings</span>}
        </NavLink>

        <a
          href="https://t.me/+support" // replace with real support
          target="_blank"
          rel="noreferrer"
          className={`${linkBase} ${linkIdle}`}
        >
          <HiQuestionMarkCircle className="w-5 h-5" />
          {open && <span>Help & Support</span>}
        </a>
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
        >
          <HiArrowLeftOnRectangle className="w-5 h-5" />
          {open && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
