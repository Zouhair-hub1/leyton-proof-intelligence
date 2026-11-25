import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import ClientSpace from './pages/ClientSpace'
import ConsultantSpace from './pages/ConsultantSpace'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/client" element={<ClientSpace />} />
      <Route path="/consultant" element={<ConsultantSpace />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
