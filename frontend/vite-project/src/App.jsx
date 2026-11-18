import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Experience from './pages/Experience'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/experience" element={<Experience />} />
      </Routes>
    </BrowserRouter>
  )
}