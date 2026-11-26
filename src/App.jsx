import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import Layout from './components/Layout.jsx'
import Toaster from './components/Toaster.jsx'
import { Login, ChangePassword } from './pages/Login.jsx'
import Employees from './pages/Employees.jsx'
import Roles from './pages/Roles.jsx'
import Projects from './pages/Projects.jsx'
import HolidayCalendar from './pages/HolidayCalendar.jsx'
import Events from './pages/Events.jsx'
import Attendance from './pages/Attendance.jsx'

export default function App() {
  const { user, loading, offline, retry } = useAuth()
  if (loading) return <div className="min-h-screen grid place-items-center text-slate-400">Loading…</div>
  if (offline) return (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Can't reach the server</h1>
        <p className="text-slate-500 mt-1 mb-4">It may be restarting. You are still signed in.</p>
        <button onClick={retry} className="rail text-ink font-medium rounded-xl px-4 py-2">Try again</button>
      </div>
    </div>
  )
  if (!user) return <Login />
  if (user.mustChangePassword) return <ChangePassword />

  return (
    <>
      <Toaster />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/employees" replace />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/roles" element={<Roles />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/holiday-calendar" element={<HolidayCalendar />} />
          <Route path="/events" element={<Events />} />
          {user.role !== 'client' && <Route path="/attendance" element={<Attendance />} />}
          <Route path="*" element={<Navigate to="/employees" replace />} />
        </Route>
      </Routes>
    </>
  )
}
