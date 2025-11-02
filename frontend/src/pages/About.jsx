import React from "react";

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-cyan-100 to-teal-100 dark:from-blue-950 dark:via-cyan-900 dark:to-teal-950">
      <div className="max-w-400 mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-cyan-800 dark:text-cyan-100">
            About CrowdCare
          </h1>
          <p className="mt-2 text-cyan-900/80 dark:text-cyan-100/80">
            CrowdCare is a real‑time hospital–ambulance coordination platform that reduces emergency response times by connecting drivers and hospitals with instant alerts, live location, and role‑based workflows. [memory:435][web:294]
          </p>
        </header>

        <section className="mb-10">
          <h2 className="text-2xl font-extrabold text-cyan-800 dark:text-cyan-100">Our motive</h2>
          <p className="mt-2 text-cyan-900/80 dark:text-cyan-100/80">
            During large public events and daily emergencies, hospitals often lack advance notice and context about incoming patients, which delays triage and resource allocation. [memory:435]
          </p>
          <p className="mt-2 text-cyan-900/80 dark:text-cyan-100/80">
            The goal is to give hospitals a clear pre‑arrival signal and live distance so staff can prepare equipment, rooms, and specialists before the ambulance arrives. [memory:435]
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-extrabold text-cyan-800 dark:text-cyan-100">Why we started</h2>
          <p className="mt-2 text-cyan-900/80 dark:text-cyan-100/80">
            This initiative grew out of building a hospital management stack in React where real‑time updates and low‑friction onboarding were essential for field teams. [memory:436][memory:440]
          </p>
          <p className="mt-2 text-cyan-900/80 dark:text-cyan-100/80">
            Firebase was chosen to deliver instant sync and simple auth while keeping costs low for a student and hackathon‑friendly deployment path. [memory:441][web:294]
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-extrabold text-cyan-800 dark:text-cyan-100">What we built</h2>
          <ul className="mt-3 space-y-2 list-disc pl-6 text-cyan-900/80 dark:text-cyan-100/80">
            <li>Separate multi‑step registrations for hospitals and drivers that persist structured profiles and capacity details. [memory:435][web:215]</li>
            <li>Role‑aware login with tab selection, pre‑checks from the database, and support for secure custom claims on tokens. [memory:435][web:209]</li>
            <li>Pre‑alerts that a driver sends to a selected hospital, including ambulance type such as Basic, Advanced, or ICU. [memory:435]</li>
            <li>Live driver location streaming and hospital distance display using real‑time database reads and client‑side computation. [memory:435][web:215]</li>
            <li>Push notifications to hospital devices via Firebase Cloud Messaging using topics or stored tokens. [memory:435][web:355]
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-extrabold text-cyan-800 dark:text-cyan-100">How it works</h2>
          <p className="mt-2 text-cyan-900/80 dark:text-cyan-100/80">
            Data is stored as JSON and synchronized in real time to connected clients, which keeps dashboards and driver apps instantly in sync. [web:294]
          </p>
          <p className="mt-2 text-cyan-900/80 dark:text-cyan-100/80">
            Clients use one‑time reads for initial loads and event listeners for live updates to balance responsiveness and efficiency. [web:215]
          </p>
          <p className="mt-2 text-cyan-900/80 dark:text-cyan-100/80">
            Pre‑alerts trigger server logic to broadcast FCM notifications to hospital topics or device tokens, ensuring immediate visibility across staff devices. [web:355][web:312]
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-extrabold text-cyan-800 dark:text-cyan-100">Routing and distance</h2>
          <p className="mt-2 text-cyan-900/80 dark:text-cyan-100/80">
            The UI shows continuous straight‑line distance using live coordinates for instant feedback without paid API calls. [memory:435][web:215]
          </p>
          <p className="mt-2 text-cyan-900/80 dark:text-cyan-100/80">
            When accurate road ETA is needed, a backend endpoint can call Google’s Distance Matrix or Routes APIs with billing, then push ETA back for both sides to read. [web:332][web:334]
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-extrabold text-cyan-800 dark:text-cyan-100">Security and roles</h2>
          <p className="mt-2 text-cyan-900/80 dark:text-cyan-100/80">
            Access is enforced with Security Rules scoped to authenticated users and optionally reinforced with custom claims embedded in ID tokens. [web:209]
          </p>
          <p className="mt-2 text-cyan-900/80 dark:text-cyan-100/80">
            Claims are set from a trusted server using the Admin SDK and can be read on the client to steer UI while the backend verifies tokens for protected actions. [web:209]
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-extrabold text-cyan-800 dark:text-cyan-100">Why Firebase</h2>
          <ul className="mt-3 space-y-2 list-disc pl-6 text-cyan-900/80 dark:text-cyan-100/80">
            <li>Realtime Database gives sub‑second sync and simple reads/listeners that fit emergency operations. [web:294][web:215]</li>
            <li>Auth provides fast email/password onboarding across roles, which reduces friction in the field. [web:294]</li>
            <li>Cloud Messaging delivers topic and token notifications from a server using the Admin SDK. [web:355][web:312]</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-extrabold text-cyan-800 dark:text-cyan-100">Impact we seek</h2>
          <p className="mt-2 text-cyan-900/80 dark:text-cyan-100/80">
            Shorten door‑to‑treatment intervals by preparing hospitals before arrival and reducing radio‑only coordination. [memory:435]
          </p>
          <p className="mt-2 text-cyan-900/80 dark:text-cyan-100/80">
            Provide a zero‑to‑low‑cost deployment path for teams and events that need reliable coordination without heavy infrastructure. [memory:441][web:294]
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-extrabold text-cyan-800 dark:text-cyan-100">What’s next</h2>
          <ul className="mt-3 space-y-2 list-disc pl-6 text-cyan-900/80 dark:text-cyan-100/80">
            <li>Capacity‑aware recommendations and shift‑aware routing to send drivers to the best‑prepared facility. [memory:435]</li>
            <li>Configurable alerts, triage notes, and acceptance workflows for smoother handoffs. [memory:435]</li>
            <li>Cost‑optimized road ETA using server calls with clear usage budgets and monitoring. [web:332][web:334]</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-extrabold text-cyan-800 dark:text-cyan-100">Contact</h2>
          <p className="mt-2 text-cyan-900/80 dark:text-cyan-100/80">
            Built with React and Tailwind, backed by Firebase services, and developed to support hospitals and drivers working under pressure. [memory:440][web:294]
          </p>
        </section>
      </div>
    </div>
  );
}
