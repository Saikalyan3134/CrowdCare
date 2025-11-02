// src/components/HospitalSidebar.jsx
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { HiOutlineBellAlert, HiOutlineHome, HiOutlineMapPin, HiOutlineUserGroup, HiOutlineCog6Tooth, HiArrowLeftOnRectangle } from "react-icons/hi2";

export default function HospitalSidebar() {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  const item = "flex items-center gap-3 px-3 py-2 rounded-lg transition";
  const idle = "text-cyan-200/90 hover:bg-white/10";
  const active = "bg-white/10 text-white ring-1 ring-white/10";

  return (
    <aside
      className={`h-screen ${open ? "w-64" : "w-20"} sticky top-0 z-30
                  bg-white/10 dark:bg-zinc-900/20 backdrop-blur-md
                  border-r border-white/10 dark:border-white/10
                  text-cyan-50 transition-[width] duration-200`}
      aria-label="Hospital navigation"
    >
      <div className="h-16 flex items-center justify-between px-3">
        <button
          onClick={() => navigate("/")}
          className="text-xl font-extrabold text-cyan-100 tracking-wide"
          title="CrowdCare"
        >
          {open ? "CrowdCare" : "CC"}
        </button>
        <button
          onClick={() => setOpen((s) => !s)}
          className="text-cyan-100/80 hover:text-white rounded-lg px-2 py-1"
          aria-label="Toggle sidebar"
        >
          {open ? "◀" : "▶"}
        </button>
      </div>

      <nav className="px-3 py-2 space-y-1">
        <NavLink to="/HSdashboard"
          className={({ isActive }) => `${item} ${isActive ? active : idle}`}>
          <HiOutlineHome className="w-5 h-5" />
          {open && <span>Overview</span>}
        </NavLink>


        <NavLink to="/hospital/manage"
          className={({ isActive }) => `${item} ${isActive ? active : idle}`}>
          <HiOutlineUserGroup className="w-5 h-5" />
          {open && <span>Manage</span>}
        </NavLink>

        <NavLink to="/hospital/prealerts"
          className={({ isActive }) => `${item} ${isActive ? active : idle}`}>
          <HiOutlineBellAlert className="w-5 h-5" />
          {open && <span>Pre‑alerts</span>}
        </NavLink>

        <NavLink to="/hospital/patients"
          className={({ isActive }) => `${item} ${isActive ? active : idle}`}>
          <HiOutlineMapPin className="w-5 h-5" />
          {open && <span>Patients</span>}
        </NavLink>

        <NavLink to="/HSdashboard?tab=settings"
          className={({ isActive }) => `${item} ${isActive ? active : idle}`}>
          <HiOutlineCog6Tooth className="w-5 h-5" />
          {open && <span>Settings</span>}
        </NavLink>
      </nav>

      <div className="mt-auto px-3 py-3">
        <button
          onClick={() => navigate("/login")}
          className={`${item} ${idle} w-full`}
        >
          <HiArrowLeftOnRectangle className="w-5 h-5" />
          {open && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
