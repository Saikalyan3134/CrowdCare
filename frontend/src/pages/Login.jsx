import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { HiUser, HiLockClosed } from "react-icons/hi2";

export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("hospital");
  const [email, setEmail] = useState(""); // Email
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Navigate to dashboard after successful login
      navigate('/dashboard');
    } catch (err) {
      setError("Invalid email or password.");
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setResetMessage("Please enter your email address.");
      return;
    }
    
    setResetLoading(true);
    setResetMessage("");
    
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage("Password reset email sent! Check your inbox and spam folder.");
    } catch (err) {
      setResetMessage("Failed to send reset email. Please check your email address.");
    }
    
    setResetLoading(false);
  };

  const handleBackToLogin = () => {
    setForgotPassword(false);
    setResetEmail("");
    setResetMessage("");
    setError("");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-tr from-blue-100 via-cyan-200 to-teal-100 dark:from-blue-950 dark:via-cyan-900 dark:to-teal-950 transition-colors px-4">
      {/* Logo and Title */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl md:text-3xl font-black text-cyan-700 dark:text-cyan-200 mb-1 tracking-wide">
          CrowdCare<br /><span className="font-medium text-cyan-600 dark:text-cyan-300">Hospital And Ambulance System</span>
        </h1>
      </div>

      {/* Glass Card */}
      <div className="w-full max-w-md mx-auto bg-white/80 dark:bg-zinc-900/80 rounded-2xl shadow-2xl p-8 backdrop-blur-md border border-cyan-100 dark:border-cyan-900 ring-1 ring-cyan-100 dark:ring-cyan-900 flex flex-col gap-7">
        {!forgotPassword ? (
          <>
            {/* Tabs */}
            <div className="flex items-center justify-between mb-5 rounded-full bg-cyan-100 dark:bg-cyan-900 p-1">
              {[
                { label: "Hospital Staff", value: "hospital" },
                { label: "Ambulance Driver", value: "driver" },
              ].map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTab(t.value)}
                  className={`w-1/2 py-2 font-bold text-base rounded-full transition-all ${
                    tab === t.value
                      ? "bg-cyan-600 text-white shadow"
                      : "text-cyan-700 dark:text-cyan-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Welcome */}
            <div className="text-center mb-3">
              <h2 className="font-bold text-lg mb-2 text-gray-800 dark:text-cyan-100">Welcome!</h2>
              <span className="text-cyan-700 dark:text-cyan-300 text-sm">Sign in to your account below</span>
            </div>

            {/* Email and Password */}
            <form onSubmit={handleSubmit}>
              <div>
                <div className="flex items-center mb-3 bg-cyan-50 dark:bg-zinc-800 rounded-xl border-2 border-cyan-100 dark:border-cyan-700 px-3">
                  <HiUser className="text-cyan-500 w-5 h-5" />
                  <input
                    type="email"
                    required
                    autoFocus
                    className="bg-transparent w-full border-0 outline-none px-2 py-3 font-medium placeholder:text-gray-400 text-gray-800 dark:text-cyan-50"
                    placeholder={tab === "hospital" ? "Hospital Email" : "Driver Email"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="flex items-center mb-2 bg-cyan-50 dark:bg-zinc-800 rounded-xl border-2 border-cyan-100 dark:border-cyan-700 px-3">
                  <HiLockClosed className="text-cyan-500 w-5 h-5" />
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    className="bg-transparent w-full border-0 outline-none px-2 py-3 font-medium placeholder:text-gray-400 text-gray-800 dark:text-cyan-50"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    tabIndex={-1}
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="text-cyan-500 text-xs font-semibold ml-2"
                  >
                    [Show]
                  </button>
                </div>
              </div>

              {/* Options and Error */}
              <div className="flex items-center justify-between text-sm text-cyan-700 dark:text-cyan-300">
                <label className="inline-flex items-center gap-1">
                  <input type="checkbox" className="accent-cyan-500" />
                  Remember Me
                </label>
                <button
                  type="button"
                  onClick={() => setForgotPassword(true)}
                  className="hover:text-cyan-900 dark:hover:text-cyan-100 text-cyan-600 dark:text-cyan-400 underline"
                >
                  Forgot Password?
                </button>
              </div>
              {error && <div className="text-center text-base text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900 rounded p-2">{error}</div>}

              {/* Sign In Button */}
              <button
                type="submit"
                className="mt-2 rounded-full py-3 font-bold text-lg w-full bg-cyan-600 hover:bg-cyan-700 text-white shadow-md transition"
                disabled={loading}
              >
                {loading ? "Signing in..." : "SIGN IN"}
              </button>
            </form>
            <div className="text-sm text-center text-cyan-700 dark:text-cyan-300 mt-4">
              <div className="mb-2">
                Don't have an account? <button onClick={() => navigate('/register')} className="underline hover:text-cyan-800 dark:hover:text-cyan-100 font-semibold">Register Here</button>
              </div>
              Need help? <a href="#" className="underline hover:text-cyan-800 dark:hover:text-cyan-100">Contact IT Support</a>
            </div>
          </>
        ) : (
          <>
            {/* Forgot Password Form */}
            <div className="text-center mb-3">
              <h2 className="font-bold text-lg mb-2 text-gray-800 dark:text-cyan-100">Reset Password</h2>
              <span className="text-cyan-700 dark:text-cyan-300 text-sm">Enter your email to receive reset instructions</span>
            </div>

            <form onSubmit={handleForgotPassword}>
              <div className="flex items-center mb-3 bg-cyan-50 dark:bg-zinc-800 rounded-xl border-2 border-cyan-100 dark:border-cyan-700 px-3">
                <HiUser className="text-cyan-500 w-5 h-5" />
                <input
                  type="email"
                  required
                  autoFocus
                  className="bg-transparent w-full border-0 outline-none px-2 py-3 font-medium placeholder:text-gray-400 text-gray-800 dark:text-cyan-50"
                  placeholder="Enter your email address"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              {resetMessage && (
                <div className={`text-center text-base rounded p-2 mb-3 ${
                  resetMessage.includes("sent") 
                    ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900" 
                    : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900"
                }`}>
                  {resetMessage}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="flex-1 rounded-full py-3 font-bold text-lg bg-gray-500 hover:bg-gray-600 text-white shadow-md transition"
                >
                  Back to Login
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-full py-3 font-bold text-lg bg-cyan-600 hover:bg-cyan-700 text-white shadow-md transition"
                  disabled={resetLoading}
                >
                  {resetLoading ? "Sending..." : "Send Reset Email"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
