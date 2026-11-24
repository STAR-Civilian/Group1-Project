import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppFooter from './components/AppFooter'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import Experience from './pages/Experience'
import ResumePage from './pages/ResumePage'
import TargetJobs from './pages/TargetJobs'
import StarPage from './pages/StarPage'


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/signup" element={<AuthPage initialMode="signup" />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/experience" element={<Experience />} />
        <Route path="/jobs" element={<TargetJobs />} />
        <Route path="/resume" element={<ResumePage />} />
        <Route path="/star" element={<StarPage />} />
      </Routes>
      <AppFooter />
    </BrowserRouter>
  )
}