import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppFooter from './components/AppFooter'
import AuthPage from './pages/AuthPage'
import Experience from './pages/Experience'
import ResumePage from './pages/ResumePage'
import TargetJobs from './pages/TargetJobs'
import StarPage from './pages/StarPage'
import Dashboard from './pages/Dashboard'


// Logged in? Skip the login page and go straight to the dashboard.
function Landing() {
  return localStorage.getItem('token') ? <Navigate to="/dashboard" replace /> : <AuthPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signup" element={<AuthPage initialMode="signup" />} />
        <Route path="/home" element={<Navigate to="/dashboard" replace />} />
        <Route path="/experience" element={<Experience />} />
        <Route path="/jobs" element={<TargetJobs />} />
        <Route path="/resume" element={<ResumePage />} />
        <Route path="/star" element={<StarPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
      <AppFooter />
    </BrowserRouter>
  )
}