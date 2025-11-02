// App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import NavBar from "./components/Navbar";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import HospitalRegister from "./pages/HospitalRegister";
import DriverRegister from "./pages/DriverRegister";
import HospitalDashboard from "./pages/HospitalDashboard";
import HospitalManage from "./pages/HospitalManage";
import HospitalPrealerts from "./pages/HospitalPrealerts";
import DriverDashboard from "./pages/DriverDashboard";
import PatientManagement from "./pages/PatientManagement";
import CrowdDashboard from "./pages/CrowdDashboard";

function Shell() {
  const { pathname } = useLocation();
  const showNav = /^\/($|about$|contact$|HSregister$|DRregister$|login$)/.test(pathname);

  return (
    <>
      {showNav && <NavBar />}
      <div className={showNav ? "pt-16 bg-gradient-to-tr from-blue-100 via-cyan-100 to-teal-100 dark:from-blue-950 dark:via-cyan-900 dark:to-teal-950               " : ""}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/HSregister" element={<HospitalRegister />} />
        <Route path="/DRregister" element={<DriverRegister />} />
        <Route path="/login" element={<Login />} />
        

        {/* Authenticated */}
        <Route path="/HSdashboard" element={<HospitalDashboard />} />
        <Route path="/hospital/manage" element={<HospitalManage />} />
        <Route path="/hospital/prealerts" element={<HospitalPrealerts />} />
        <Route path="/hospital/patients" element={<PatientManagement />} />

        <Route path="/DRdashboard" element={<DriverDashboard />} />
        <Route path="/crowddashboard" element={<CrowdDashboard />} />
      </Routes>
      </div>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <Shell />
    </Router>
  );
}
