import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Toaster from './components/Toaster.jsx'
import Employees from './pages/Employees.jsx'
import Roles from './pages/Roles.jsx'
import Projects from './pages/Projects.jsx'
import HolidayCalendar from './pages/HolidayCalendar.jsx'
import Events from './pages/Events.jsx'

export default function App() {
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
          <Route path="*" element={<Navigate to="/employees" replace />} />
        </Route>
      </Routes>
    </>
  )
}
