// src/components/NavBar.jsx
import React from "react";
import { Link, NavLink } from "react-router-dom";

export default function NavBar() {
  const base = "px-4 py-2 rounded-lg font-medium transition";
  const link = "text-cyan-800 dark:text-cyan-200 hover:bg-white/60 dark:hover:bg-white/10";
  const cta  = "bg-cyan-600 hover:bg-cyan-700 text-white shadow";
  const active = ({ isActive }) => (isActive ? "bg-white/60 dark:bg-white/10 " : "") + link;

  return (
    <header className="fixed top-0 left-0 right-0 z-50
                       bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md
                       ring-1 ring-cyan-100 dark:ring-cyan-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4
                      flex items-center justify-between">
        <div className="text-4xl text-cyan-800 dark:text-cyan-200 font-extrabold tracking-wide">
          <Link to="/">CrowdCare</Link>
        </div>

        <nav className="flex items-center gap-3">
          <NavLink to="/contact" className={({ isActive }) => base + " " + active({ isActive })}>
            Contact Us
          </NavLink>
          <NavLink to="/about" className={({ isActive }) => base + " " + active({ isActive })}>
            About
          </NavLink>
          <Link to="/login" className={base + " " + cta}>
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
