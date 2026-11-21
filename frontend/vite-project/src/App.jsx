import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Experience from './pages/Experience'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<AuthPage />} />
        <Route path="/signup" element={<AuthPage initialMode="signup" />} />
        <Route path="/experience" element={<Experience />} />
      </Routes>
    </BrowserRouter>
  )
}