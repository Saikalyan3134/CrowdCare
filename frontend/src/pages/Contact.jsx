import React, { useState } from "react";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");

  const onChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus(""); setSubmitting(true);
    try {
      // TODO: wire to your backend/email service (e.g., EmailJS, Cloud Function, or Formspree)
      await new Promise((r) => setTimeout(r, 900));
      setStatus("✅ Message sent successfully. We’ll get back to you soon.");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      setStatus("⚠️ Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const card = "rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md ring-1 ring-cyan-100 dark:ring-cyan-900 shadow-2xl";

  const input =
    "w-full px-4 py-3 border-2 border-cyan-200 dark:border-cyan-700 bg-cyan-50/60 dark:bg-zinc-800 text-gray-900 dark:text-cyan-50 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none";

  return (
    <div className="min-h-screen py-10 bg-gradient-to-tr from-blue-100 via-cyan-200 to-teal-100 dark:from-blue-950 dark:via-cyan-900 dark:to-teal-950">
      <div className="max-w-5xl mx-auto px-4">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-cyan-700 dark:text-cyan-200">Contact Us</h1>
          <p className="mt-2 text-cyan-800/80 dark:text-cyan-200/80">
            Questions, feedback, or partnership ideas? Reach out — we’re listening.
          </p>
        </div>

        {/* Card */}
        <div className={`${card} p-6 md:p-8`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Info */}
            <div>
              <h2 className="text-2xl font-extrabold text-cyan-700 dark:text-cyan-200 mb-4">Get in Touch</h2>
              <div className="space-y-5 text-cyan-900 dark:text-cyan-100">
                <div>
                  <h3 className="font-semibold text-lg mb-1">📧 Email</h3>
                  <p className="text-cyan-800/90 dark:text-cyan-200/90">support@crowdcare.app</p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">📞 Phone</h3>
                  <p className="text-cyan-800/90 dark:text-cyan-200/90">+91 98765 43210</p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">🚨 Emergency</h3>
                  <p className="text-red-600 dark:text-red-400 font-bold text-2xl">108 / 102</p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">📍 Address</h3>
                  <p className="text-cyan-800/90 dark:text-cyan-200/90">
                    CrowdCare HQ<br />Healthcare Tech Park, Bengaluru, IN 560001
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">🕒 Office Hours</h3>
                  <ul className="text-cyan-800/90 dark:text-cyan-200/90">
                    <li>Mon–Fri: 9:00 AM – 6:00 PM</li>
                    <li>Sat: 10:00 AM – 4:00 PM</li>
                    <li>Sun: Closed (Emergency support 24/7)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Form */}
            <div>
              <h2 className="text-2xl font-extrabold text-cyan-700 dark:text-cyan-200 mb-4">Send a Message</h2>
              <form className="space-y-4" onSubmit={onSubmit}>
                <div>
                  <label className="block font-semibold text-cyan-800 dark:text-cyan-200 mb-1">Name</label>
                  <input
                    name="name"
                    type="text"
                    placeholder="Your Name"
                    className={input}
                    value={form.name}
                    onChange={onChange}
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-cyan-800 dark:text-cyan-200 mb-1">Email</label>
                  <input
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    className={input}
                    value={form.email}
                    onChange={onChange}
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-cyan-800 dark:text-cyan-200 mb-1">Subject</label>
                  <input
                    name="subject"
                    type="text"
                    placeholder="Subject"
                    className={input}
                    value={form.subject}
                    onChange={onChange}
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-cyan-800 dark:text-cyan-200 mb-1">Message</label>
                  <textarea
                    name="message"
                    rows={4}
                    placeholder="Your Message"
                    className={input}
                    value={form.message}
                    onChange={onChange}
                    required
                  />
                </div>

                {status && (
                  <div className={`rounded-lg p-3 text-center ${
                    status.startsWith("✅")
                      ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200"
                      : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200"
                  }`}>
                    {status}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full py-3 font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-md transition"
                >
                  {submitting ? "Sending..." : "Send Message"}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Support note */}
        <p className="text-center text-sm mt-6 text-cyan-800/80 dark:text-cyan-200/80">
          For critical incidents, please contact emergency numbers first. This form is monitored during office hours.
        </p>
      </div>
    </div>
  );
}
