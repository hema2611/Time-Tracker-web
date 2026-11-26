import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { FolderKanban, Users, BarChart3, UserCog, Settings, LogOut, PanelLeftClose, PanelLeftOpen, Clock } from 'lucide-react'
import { useAuth } from '../auth.jsx'
import { roleLabel } from '../lib/api.js'

// sample = screen still shows sample data, not yet connected to the backend.
const NAV = [
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/attendance', label: 'Attendance', icon: Clock, team: true },
  { to: '/team', label: 'Team & workload', icon: Users, admin: true, sample: true },
  { to: '/reports', label: 'Reports', icon: BarChart3, admin: true, sample: true },
  { to: '/users', label: 'Users & roles', icon: UserCog, admin: true },
  { to: '/settings', label: 'Settings', icon: Settings, admin: true, sample: true },
]

// Brand mark: a plan line with its milestones.
export const Mark = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true" className="shrink-0">
    <defs><linearGradient id="mk" x1="0" x2="1"><stop stopColor="#5ee6ff" /><stop offset="1" stopColor="#8b7cff" /></linearGradient></defs>
    <path d="M3 20 L10 20 L14 9 L25 9" fill="none" stroke="url(#mk)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="3" cy="20" r="2.6" fill="#5ee6ff" /><circle cx="14" cy="9" r="2.6" fill="#7aa8ff" /><circle cx="25" cy="9" r="2.6" fill="#8b7cff" />
  </svg>
)

export default function Layout() {
  const { user, logout } = useAuth()
  const nav = NAV.filter(n => (!n.admin || user.role === 'admin') && (!n.team || user.role !== 'client'))
  // The sidebar can be folded to icons; the choice is remembered on this computer.
  const [slim, setSlim] = useState(() => localStorage.getItem('nav.slim') === '1')
  useEffect(() => { localStorage.setItem('nav.slim', slim ? '1' : '0') }, [slim])

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar (desktop) */}
      <aside className={`hidden md:flex flex-col shrink-0 sticky top-0 h-screen p-3 transition-[width] duration-200 ${slim ? 'w-[76px]' : 'w-64'}`} aria-label="Main menu">
        <div className="glass border border-slate-200 rounded-2xl flex-1 flex flex-col p-2.5 min-h-0">
          <NavLink to="/projects" className={`flex items-center gap-2.5 px-2 py-2 mb-3 ${slim ? 'justify-center' : ''}`} aria-label="Project Tracker home">
            <Mark />{!slim && <span className="font-display font-semibold text-base text-slate-900">Tracker</span>}
          </NavLink>
          <nav className="flex-1 space-y-1 overflow-y-auto">
            {nav.map(({ to, label, icon: Icon, sample }) => (
              <NavLink key={to} to={to} title={slim ? label : sample ? 'Sample data, not connected yet' : undefined}
                className={({ isActive }) => `relative flex items-center gap-3 rounded-xl py-2.5 transition ${slim ? 'justify-center px-0' : 'px-3'} ${isActive ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'}`}>
                {({ isActive }) => (<>
                  {isActive && <span className="rail absolute left-0 top-2 bottom-2 w-[3px] rounded-full" />}
                  <Icon size={18} className={`shrink-0 ${isActive ? 'text-indigo-600' : ''}`} />
                  {!slim && <span className="flex-1 truncate">{label}</span>}
                  {!slim && sample && <span className="text-[10px] rounded px-1.5 py-0.5 bg-amber-100 text-amber-700">sample</span>}
                </>)}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-slate-200 pt-2.5 mt-2 space-y-1">
            <div className={`flex items-center gap-2.5 px-1.5 py-1.5 ${slim ? 'justify-center' : ''}`}>
              <div className="w-9 h-9 shrink-0 rounded-xl rail text-ink grid place-items-center font-display font-semibold" aria-hidden="true">{user.name[0]?.toUpperCase()}</div>
              {!slim && <div className="min-w-0 leading-tight"><div className="text-slate-900 font-medium truncate">{user.name}</div><div className="text-xs text-slate-500 truncate">{roleLabel(user)}</div></div>}
            </div>
            <button onClick={logout} title="Sign out" className={`w-full flex items-center gap-3 rounded-xl py-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100/60 ${slim ? 'justify-center' : 'px-3'}`}><LogOut size={17} />{!slim && 'Sign out'}</button>
            <button onClick={() => setSlim(!slim)} aria-pressed={slim} title={slim ? 'Show menu names' : 'Fold the menu'} className={`w-full flex items-center gap-3 rounded-xl py-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100/60 ${slim ? 'justify-center' : 'px-3'}`}>
              {slim ? <PanelLeftOpen size={17} /> : <><PanelLeftClose size={17} />Fold menu</>}
            </button>
          </div>
        </div>
      </aside>

      {/* Top bar (phones) */}
      <header className="md:hidden sticky top-0 z-30 glass border-b border-slate-200 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <NavLink to="/projects" className="flex items-center gap-2"><Mark size={24} /><span className="font-display font-semibold text-slate-900">Tracker</span></NavLink>
          <button onClick={logout} className="flex items-center gap-1.5 text-slate-500" aria-label="Sign out"><LogOut size={16} />Sign out</button>
        </div>
        <nav className="flex gap-1 overflow-x-auto mt-2 [scrollbar-width:none]" aria-label="Main">
          {nav.map(({ to, label }) => <NavLink key={to} to={to} className={({ isActive }) => `px-3 py-1.5 rounded-lg whitespace-nowrap ${isActive ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-500'}`}>{label}</NavLink>)}
        </nav>
      </header>

      <main className="flex-1 min-w-0 w-full max-w-[1600px] mx-auto px-4 md:pl-3 md:pr-8 pt-6 pb-12"><Outlet /></main>
    </div>
  )
}
