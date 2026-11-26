import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import Layout from './components/Layout.jsx'
import { Login, ChangePassword } from './pages/Login.jsx'
import Projects from './pages/Projects.jsx'
import CreateProject from './pages/CreateProject.jsx'
import TimelineFromProposal from './pages/TimelineFromProposal.jsx'
import UsersRoles from './pages/UsersRoles.jsx'
import Reports from './pages/Reports.jsx'
import Team from './pages/Team.jsx'
import Settings from './pages/Settings.jsx'
import ProjectStart from './pages/ProjectStart.jsx'
import ProjectDetail from './pages/ProjectDetail.jsx'
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
  const admin = user.role === 'admin'

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        {user.role !== 'client' && <Route path="/attendance" element={<Attendance />} />}
        {admin && <>
          <Route path="/projects/start" element={<ProjectStart />} />
          <Route path="/projects/new" element={<CreateProject />} />
          <Route path="/projects/new/timeline" element={<TimelineFromProposal />} />
          <Route path="/team" element={<Team />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/users" element={<UsersRoles />} />
          <Route path="/settings" element={<Settings />} />
        </>}
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Route>
    </Routes>
  )
}
