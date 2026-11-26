import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Users, Shield, FolderKanban, CalendarDays, PartyPopper, ChevronDown, Database, Sparkles, Clock, LogOut } from 'lucide-react'
import { useAuth } from '../auth.jsx'
import { ThemeToggle } from '../lib/theme.jsx'

const GROUPS = [
  {
    key: 'masters', label: 'Masters', icon: Database,
    items: [
      { to: '/employees', label: 'Employees', icon: Users },
      { to: '/roles', label: 'Roles', icon: Shield },
      { to: '/projects', label: 'Projects', icon: FolderKanban },
    ],
  },
  {
    key: 'events', label: 'Events', icon: Sparkles,
    items: [
      { to: '/holiday-calendar', label: 'Holiday Calendar', icon: CalendarDays },
      { to: '/events', label: 'Events', icon: PartyPopper },
    ],
  },
  {
    key: 'work', label: 'Work', icon: Clock, team: true,
    items: [
      { to: '/attendance', label: 'Attendance', icon: Clock },
    ],
  },
]
const ALL_ITEMS = GROUPS.flatMap(g => g.items)

// The real ImagiNET Ventures logo (public/brand). Wordmark for menus, orb where a square mark is needed.
export const Brand = ({ compact = false }) => (
  <div className="flex flex-col items-start gap-1">
    <img src="/brand/imaginet-logo-clear.png" alt="ImagiNET Ventures" className={`brand-word self-start object-contain ${compact ? 'h-6 w-auto' : 'h-8 w-auto max-w-[200px]'}`} draggable="false" />
    <div className="text-[11px] uppercase tracking-[0.2em] text-fg-3 pl-0.5">Tracker</div>
  </div>
)

export const Mark = ({ size = 36 }) => (
  <img src="/brand/imaginet-orb.png" alt="ImagiNET" width={size} height={size} className="shrink-0 rounded-full" draggable="false" />
)

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg pl-6 pr-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-indigo-600 text-white shadow-glow' : 'text-fg-2 hover:bg-elevated hover:text-fg'
  }`

export default function Layout() {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const groups = GROUPS.filter(g => !g.team || user.role !== 'client')
  // Which groups are expanded; remembered on this computer. Default: all open.
  const [open, setOpen] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nav.groups')) || { masters: true, events: true } } catch { return { masters: true, events: true } }
  })
  useEffect(() => { localStorage.setItem('nav.groups', JSON.stringify(open)) }, [open])

  // Always open the group that holds the current page.
  useEffect(() => {
    const g = GROUPS.find(g => g.items.some(i => pathname.startsWith(i.to)))
    if (g && !open[g.key]) setOpen(o => ({ ...o, [g.key]: true }))
  }, [pathname])

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar (desktop) — one solid navy colour */}
      <aside className="hidden md:flex flex-col shrink-0 sticky top-0 h-screen w-64 bg-sidebar border-r border-line p-4" aria-label="Main menu">
        <div className="px-1 py-1 mb-6"><Brand /></div>
        <nav className="space-y-3 overflow-y-auto flex-1 -mx-1 px-1">
          {groups.map(g => {
            const isOpen = !!open[g.key]
            const hasActive = g.items.some(i => pathname.startsWith(i.to))
            const GIcon = g.icon
            return (
              <div key={g.key}>
                <button type="button" onClick={() => setOpen(o => ({ ...o, [g.key]: !o[g.key] }))} aria-expanded={isOpen}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition ${hasActive ? 'text-fg' : 'text-fg-2'} hover:bg-elevated`}>
                  <GIcon size={16} className="shrink-0 text-violet-light" />
                  <span className="flex-1 text-left">{g.label}</span>
                  <ChevronDown size={15} className={`shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`} />
                </button>
                <div className={`grid transition-[grid-template-rows] duration-200 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <div className="space-y-1 pt-1">
                      {g.items.map(({ to, label, icon: Icon }) => (
                        <NavLink key={to} to={to} className={linkClass}>
                          <Icon size={17} className="shrink-0" />
                          <span className="truncate">{label}</span>
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </nav>
        <div className="pt-4 border-t border-white/10 px-2 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm text-fg truncate">{user.name}</div>
            <div className="text-xs text-slate-400 truncate">{user.email}</div>
          </div>
          <ThemeToggle />
          <button type="button" onClick={logout} title="Sign out" aria-label="Sign out" className="p-2 rounded-lg text-fg-2 hover:bg-elevated hover:text-fg"><LogOut size={17} /></button>
        </div>
      </aside>

      {/* Top bar (phones) */}
      <header className="md:hidden sticky top-0 z-30 bg-sidebar border-r border-line px-4 py-3">
        <div className="flex items-center justify-between"><Brand /><div className="flex items-center"><ThemeToggle /><button type="button" onClick={logout} aria-label="Sign out" className="p-2 rounded-lg text-fg-2"><LogOut size={17} /></button></div></div>
        <nav className="flex gap-1.5 mt-3 overflow-x-auto [scrollbar-width:none]" aria-label="Main">
          {groups.flatMap(g => g.items).map(({ to, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => `px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${isActive ? 'bg-indigo-600 text-white' : 'text-fg-2 hover:bg-elevated'}`}>{label}</NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 min-w-0 w-full max-w-[1500px] mx-auto px-4 md:px-8 pt-7 pb-14"><Outlet /></main>
    </div>
  )
}
