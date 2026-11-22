import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import Experience from './pages/Experience'
import TargetJobs from './pages/TargetJobs'


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/signup" element={<AuthPage initialMode="signup" />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/experience" element={<Experience />} />
        <Route path="/jobs" element={<TargetJobs />} />
      </Routes>
    </BrowserRouter>
  )
}