import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Users, Shield, FolderKanban, CalendarDays, PartyPopper, ChevronDown, Database, Sparkles } from 'lucide-react'

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
]
const ALL_ITEMS = GROUPS.flatMap(g => g.items)

// ImagiNET wordmark: a rounded blue tile with the monogram.
export const Brand = ({ dark = false }) => (
  <div className="flex items-center gap-2.5">
    <div className="w-9 h-9 shrink-0 rounded-xl bg-indigo-600 grid place-items-center text-white font-bold text-base shadow-[0_6px_16px_-6px_rgba(37,99,235,0.7)]">iN</div>
    <div className="leading-tight">
      <div className={`font-display font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>ImagiNET</div>
      <div className="text-[11px] -mt-0.5 text-slate-400">Tracker</div>
    </div>
  </div>
)

// Back-compat alias for the colleague's Login.jsx, which imports { Mark }.
export const Mark = ({ size = 36 }) => (
  <div className="rounded-xl bg-indigo-600 grid place-items-center text-white font-bold shadow-[0_6px_16px_-6px_rgba(37,99,235,0.7)]" style={{ width: size, height: size, fontSize: size * 0.4 }}>iN</div>
)

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg pl-6 pr-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-indigo-600 text-white shadow-[0_6px_16px_-8px_rgba(37,99,235,0.9)]' : 'text-slate-300 hover:bg-white/5 hover:text-white'
  }`

export default function Layout() {
  const { pathname } = useLocation()
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
      <aside className="hidden md:flex flex-col shrink-0 sticky top-0 h-screen w-64 bg-[#101c3d] p-4" aria-label="Main menu">
        <div className="px-1 py-1 mb-6"><Brand dark /></div>
        <nav className="space-y-3 overflow-y-auto flex-1 -mx-1 px-1">
          {GROUPS.map(g => {
            const isOpen = !!open[g.key]
            const hasActive = g.items.some(i => pathname.startsWith(i.to))
            const GIcon = g.icon
            return (
              <div key={g.key}>
                <button type="button" onClick={() => setOpen(o => ({ ...o, [g.key]: !o[g.key] }))} aria-expanded={isOpen}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition ${hasActive ? 'text-white' : 'text-slate-300'} hover:bg-white/5`}>
                  <GIcon size={16} className="shrink-0 text-indigo-300" />
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
        <div className="pt-4 border-t border-white/10 text-xs text-slate-400 px-2">ImagiNET Tracker</div>
      </aside>

      {/* Top bar (phones) */}
      <header className="md:hidden sticky top-0 z-30 bg-[#101c3d] px-4 py-3">
        <Brand dark />
        <nav className="flex gap-1.5 mt-3 overflow-x-auto [scrollbar-width:none]" aria-label="Main">
          {ALL_ITEMS.map(({ to, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => `px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-white/5'}`}>{label}</NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 min-w-0 w-full max-w-[1500px] mx-auto px-4 md:px-8 pt-7 pb-14"><Outlet /></main>
    </div>
  )
}
