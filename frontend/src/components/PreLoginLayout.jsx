// src/components/PreLoginLayout.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function PreLoginLayout({ children }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-cyan-200 to-teal-100 dark:from-blue-950 dark:via-cyan-900 dark:to-teal-950">
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-3xl text-cyan-800 dark:text-cyan-200 font-extrabold tracking-wide">
            CrowdCare
          </div>
        </div>
        <nav className="flex items-center gap-3">
          <button
            className="px-4 py-2 rounded-lg text-cyan-800 dark:text-cyan-200 hover:bg-white/70 dark:hover:bg-white/10"
            onClick={() => navigate("/contact")}
          >
            Contact Us
          </button>
          <button
            className="px-4 py-2 rounded-lg text-cyan-800 dark:text-cyan-200 hover:bg-white/70 dark:hover:bg-white/10"
            onClick={() => navigate("/about")}
          >
            About
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white shadow"
            onClick={() => navigate("/login")}
          >
            Sign in
          </button>
        </nav>
      </header>

      <main className="max-w-10xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
