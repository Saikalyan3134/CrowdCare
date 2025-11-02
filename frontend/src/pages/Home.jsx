// src/pages/Home.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { HiBolt, HiMapPin, HiShieldCheck, HiBellAlert } from "react-icons/hi2";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-cyan-100 to-teal-100 dark:from-blue-950 dark:via-cyan-900 dark:to-teal-950">
      {/* Top Nav */}

      {/* Hero */}
      <section className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-cyan-800 dark:text-cyan-100 leading-tight">
              Coordinate Hospitals and Ambulances in Real Time
            </h1>
            <p className="mt-4 text-cyan-800/80 dark:text-cyan-200/90 text-lg">
              Live driver tracking, instant pre‑arrival alerts, and capacity‑aware routing to cut response times when every minute matters.
            </p>
            <p className="mt-4 text-cyan-800/80 dark:text-cyan-200/90 text-lg"> Want to contribute your efforts to help the community? </p>
            <div className="mt-8 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  aria-label="Hospital Staff Login"
                  className="flex-1 sm:flex-none px-6 py-3 rounded-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold shadow-md transition"
                  onClick={() => navigate("/HSregister")}
                >
                  I'm Hospital Staff
                </button>
                <button
                  aria-label="Ambulance Driver Login"
                  className="flex-1 sm:flex-none px-6 py-3 rounded-full bg-white/80 hover:bg-white text-cyan-800 font-bold shadow-md ring-1 ring-cyan-200 transition"
                  onClick={() => navigate("/DRregister")}
                >
                  I'm a Driver
                </button>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-cyan-200 dark:border-cyan-800">
                <p className="text-cyan-800 dark:text-cyan-200 font-semibold">Is There an Emergency??</p>
                <button
                  aria-label="Emergency Crowd Dashboard"
                  className="px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold shadow-md transition"
                  onClick={() => navigate("/crowddashboard")}
                >
                  Emergency - Crowd
                </button>
              </div>
            </div>

          </div>

          <div className="relative">
            <div className="rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md ring-1 ring-cyan-100 dark:ring-cyan-900 p-6 shadow-2xl">
              <div className="grid grid-cols-2 gap-4">
                <FeatureCard
                  icon={<HiBolt className="w-6 h-6" />}
                  title="Instant Alerts"
                  desc="One‑tap prealerts to hospitals with ambulance type and ETA."
                />
                <FeatureCard
                  icon={<HiMapPin className="w-6 h-6" />}
                  title="Live Distance"
                  desc="See driver–hospital distance update in real time."
                />
                <FeatureCard
                  icon={<HiShieldCheck className="w-6 h-6" />}
                  title="Secure Access"
                  desc="Role‑based auth for hospitals and drivers."
                />
                <FeatureCard
                  icon={<HiBellAlert className="w-6 h-6" />}
                  title="Smart Routing"
                  desc="Capacity‑aware workflows and fast coordination."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-10 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl lg:text-3xl font-extrabold text-cyan-800 dark:text-cyan-100 text-center">
            How CrowdCare Works
          </h2>
          <p className="text-center mt-2 text-cyan-800/80 dark:text-cyan-200/90">
            Designed for speed, clarity, and safety from alert to admission.
          </p>

          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <StepCard step="1" title="Register & Sign In" desc="Hospitals and drivers create accounts with secure role‑based access." />
            <StepCard step="2" title="Alert & Track" desc="Driver selects a hospital and sends a prealert with live location." />
            <StepCard step="3" title="Prepare & Admit" desc="Hospital receives details and prepares resources before arrival." />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-cyan-800/80 dark:text-cyan-300/80">
          <div>© {new Date().getFullYear()} CrowdCare • Built for rapid, reliable emergency coordination</div>
          <div className="mt-2">
            <button
              onClick={() => navigate("/contact")}
              className="underline hover:text-cyan-900 dark:hover:text-cyan-100"
            >
              Contact Us
            </button>
            <span className="mx-2">•</span>
            <button
              onClick={() => navigate("/About")}
              className="underline hover:text-cyan-900 dark:hover:text-cyan-100"
            >
              About
            </button>
            <span className="mx-2">•</span>
            <button
              onClick={() => navigate("/team")}
              className="underline hover:text-cyan-900 dark:hover:text-cyan-100"
            >
              Meet the Team
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="rounded-2xl p-4 bg-cyan-50 dark:bg-zinc-800 border border-cyan-100 dark:border-cyan-900 text-cyan-900 dark:text-cyan-100 shadow-sm">
      <div className="text-cyan-600 dark:text-cyan-400">{icon}</div>
      <div className="mt-2 font-bold">{title}</div>
      <div className="text-sm text-cyan-900/80 dark:text-cyan-100/80">{desc}</div>
    </div>
  );
}

function StepCard({ step, title, desc }) {
  return (
    <div className="rounded-2xl p-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md ring-1 ring-cyan-100 dark:ring-cyan-900 shadow">
      <div className="w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center font-bold">
        {step}
      </div>
      <div className="mt-3 font-extrabold text-cyan-800 dark:text-cyan-100">{title}</div>
      <div className="text-sm text-cyan-800/80 dark:text-cyan-200/80 mt-1">{desc}</div>
    </div>
  );
}
