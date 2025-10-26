import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import HospitalManager from './components/HospitalManager'
import HospitalRegister from './pages/HospitalRegister'
import Login from './pages/Login'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<HospitalRegister />} />
        <Route path="/dashboard" element={<HospitalManager />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  )
}

export default App
