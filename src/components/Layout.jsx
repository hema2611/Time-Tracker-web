import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Users, Shield, FolderKanban, CalendarDays, PartyPopper, ChevronDown, ChevronLeft, Database, Sparkles, Clock, LogOut, CalendarOff, FolderGit2, Wallet, Briefcase, Ticket } from 'lucide-react'
import { useAuth } from '../auth.jsx'
import { ThemeToggle } from '../lib/theme.jsx'
import { api } from '../lib/api.js'

const GROUPS = [
  {
    key: 'masters', label: 'Masters', icon: Database,
    items: [
      { to: '/employees', label: 'Employees', icon: Users, permission: 'employees' },
      { to: '/roles', label: 'Roles', icon: Shield, permission: 'roles' },
      { to: '/projects', label: 'Projects', icon: FolderKanban, permission: 'projects' },
      { to: '/project-repository', label: 'Project Repository', icon: FolderGit2, permission: 'project_repository' },
    ],
  },
  {
    key: 'events', label: 'Events', icon: Sparkles,
    items: [
      { to: '/holiday-calendar', label: 'Holiday Calendar', icon: CalendarDays, permission: 'holiday_calendar' },
      { to: '/events', label: 'Events', icon: PartyPopper, permission: 'events' },
    ],
  },
  {
    key: 'work', label: 'Work', icon: Clock, team: true,
    items: [
      { to: '/attendance', label: 'Attendance', icon: Clock, permission: 'attendance' },
      { to: '/leave', label: 'Leave & Permission', icon: CalendarOff, permission: 'leave' },
      { to: '/tickets', label: 'Ticketing System', icon: Ticket, permission: 'tickets' },
      { to: '/work-allotment', label: 'Work Allotment', icon: Briefcase, permission: 'work_allotment' },
      { to: '/reimbursements', label: 'Reimbursements', icon: Wallet, permission: 'reimbursements' },
    ],
  },
]

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

// Label that appears beside an icon when the sidebar is collapsed.
const Tip = ({ children }) => (
  <span role="tooltip"
    className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 whitespace-nowrap rounded-lg border border-line bg-elevated px-2.5 py-1.5 text-xs font-medium text-fg shadow-pop
      opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 transition duration-150">
    {children}
  </span>
)

const isTyping = el => el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

export default function Layout() {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const [permissions, setPermissions] = useState(null)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('nav.collapsed') === 'true')
  useEffect(() => { api('/permissions/me').then(setPermissions).catch(() => setPermissions({ modules: {} })) }, [user?.id])
  const groups = GROUPS
    .map(g => ({ ...g, items: g.items.filter(i => (!g.team || user.role !== 'client') && permissions?.modules?.[i.permission]?.view) }))
    .filter(g => g.items.length)

  // Which groups are expanded; remembered on this computer. Default: all open.
  const [open, setOpen] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nav.groups')) || { masters: true, events: true, work: true } } catch { return { masters: true, events: true, work: true } }
  })
  useEffect(() => { localStorage.setItem('nav.groups', JSON.stringify(open)) }, [open])
  useEffect(() => { localStorage.setItem('nav.collapsed', String(collapsed)) }, [collapsed])

  // Accordion: only the group that holds the current page stays open.
  useEffect(() => {
    const g = GROUPS.find(g => g.items.some(i => pathname.startsWith(i.to)))
    if (g) setOpen({ [g.key]: true })
  }, [pathname])

  // Ctrl+B (⌘B on Mac) folds / unfolds the sidebar, except while typing.
  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b' && !isTyping(document.activeElement)) {
        e.preventDefault()
        setCollapsed(c => !c)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const toggleLabel = collapsed ? 'Expand sidebar' : 'Collapse sidebar'
  const initial = (user.name || user.email || '?').trim()[0]?.toUpperCase()

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar (desktop) */}
      <aside aria-label="Main menu"
        className={`relative z-40 hidden md:flex flex-col shrink-0 sticky top-0 h-screen bg-sidebar border-r border-line transition-[width] duration-200 ease-out ${collapsed ? 'w-[72px]' : 'w-64'}`}>

        {/* Edge toggle */}
        <button type="button" onClick={() => setCollapsed(c => !c)} aria-label={toggleLabel} aria-expanded={!collapsed} title={`${toggleLabel} (Ctrl+B)`}
          className="absolute -right-3 top-[26px] z-40 grid place-items-center w-6 h-6 rounded-full border border-line-strong bg-surface text-fg-2 shadow-pop
            hover:text-fg hover:border-violet-light hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-light transition">
          <ChevronLeft size={14} strokeWidth={2.5} className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
        </button>

        {/* Brand */}
        <div className={`h-[76px] shrink-0 flex items-center border-b border-line ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
          {collapsed ? <Mark size={38} /> : <Brand />}
        </div>

        {/* Navigation */}
        <nav aria-label="Main" className={`flex-1 py-4 ${collapsed ? 'px-3 overflow-visible' : 'px-3 overflow-y-auto overflow-x-hidden'}`}>
          {permissions === null && (
            <div className="space-y-2" aria-hidden="true">
              {[0, 1, 2, 3].map(i => <div key={i} className={`h-9 rounded-lg bg-elevated animate-pulse ${collapsed ? 'w-11 mx-auto' : ''}`} />)}
            </div>
          )}

          {collapsed ? (
            // Collapsed: one icon per group; hovering (or focusing) it opens a flyout with the group's pages.
            <div className="flex flex-col items-center gap-2">
              {groups.map(g => {
                const active = g.items.some(i => pathname.startsWith(i.to))
                const GIcon = g.icon
                return (
                  <div key={g.key} className="group/fly relative">
                    <button type="button" aria-label={g.label} aria-haspopup="menu"
                      className={`grid place-items-center w-11 h-11 rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-light
                        ${active ? 'bg-indigo-600 text-white shadow-glow' : 'text-fg-2 hover:bg-elevated hover:text-fg group-hover/fly:bg-elevated group-hover/fly:text-fg'}`}>
                      <GIcon size={19} />
                    </button>
                    {/* pl-3 bridges the gap so the flyout stays open while the pointer moves into it */}
                    <div role="menu" aria-label={g.label}
                      className="absolute left-full top-0 pl-3 z-50 invisible opacity-0 -translate-x-1 transition duration-150
                        group-hover/fly:visible group-hover/fly:opacity-100 group-hover/fly:translate-x-0
                        group-focus-within/fly:visible group-focus-within/fly:opacity-100 group-focus-within/fly:translate-x-0">
                      <div className="min-w-[220px] rounded-xl border border-line-strong bg-surface p-1.5 shadow-2xl">
                        <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-3">{g.label}</div>
                        {g.items.map(({ to, label, icon: Icon }) => (
                          <NavLink key={to} to={to} role="menuitem"
                            onClick={e => e.currentTarget.blur()}
                            className={({ isActive }) => `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium whitespace-nowrap transition
                              ${isActive ? 'bg-indigo-600 text-white' : 'text-fg-2 hover:bg-indigo-50 hover:text-fg'}`}>
                            <Icon size={16} className="shrink-0" />{label}
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            // Expanded: collapsible groups with labels.
            <div className="space-y-4">
              {groups.map(g => {
                const isOpen = !!open[g.key]
                const hasActive = g.items.some(i => pathname.startsWith(i.to))
                return (
                  <div key={g.key}>
                    <button type="button" onClick={() => setOpen(o => ({ ...o, [g.key]: !o[g.key] }))} aria-expanded={isOpen}
                      className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition hover:bg-elevated ${hasActive ? 'bg-indigo-50 text-indigo-700' : 'text-fg-3 hover:text-fg-2'}`}>
                      <span className="flex-1 text-left">{g.label}</span>
                      <ChevronDown size={14} className={`shrink-0 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`} />
                    </button>
                    <div className={`grid transition-[grid-template-rows] duration-200 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                      <div className="overflow-hidden">
                        <div className="space-y-1 pt-1.5">
                          {g.items.map(({ to, label, icon: Icon }) => (
                            <NavLink key={to} to={to}
                              className={({ isActive }) => `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition
                                ${isActive ? 'bg-indigo-600 text-white shadow-glow' : 'text-fg-2 hover:bg-elevated hover:text-fg'}`}>
                              <Icon size={18} className="shrink-0" />
                              <span className="truncate">{label}</span>
                            </NavLink>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </nav>

        {/* User + actions */}
        <div className={`shrink-0 border-t border-line ${collapsed ? 'px-3 py-3 flex flex-col items-center gap-1' : 'px-3 py-3'}`}>
          {collapsed ? (<>
            <div className="group relative mb-1">
              <div className="w-9 h-9 rounded-full rail text-ink grid place-items-center text-sm font-semibold" aria-label={user.name}>{initial}</div>
              <Tip>{user.name}{user.email ? ` · ${user.email}` : ''}</Tip>
            </div>
            <div className="group relative"><ThemeToggle /><Tip>Switch theme</Tip></div>
            <div className="group relative">
              <button type="button" onClick={logout} aria-label="Sign out" className="p-2 rounded-lg text-fg-2 hover:bg-elevated hover:text-fg transition"><LogOut size={17} /></button>
              <Tip>Sign out</Tip>
            </div>
          </>) : (
            <div className="flex items-center gap-2.5 rounded-xl px-1.5 py-1">
              <div className="w-9 h-9 shrink-0 rounded-full rail text-ink grid place-items-center text-sm font-semibold">{initial}</div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-sm font-medium text-fg truncate">{user.name}</div>
                <div className="text-xs text-fg-3 truncate">{user.email}</div>
              </div>
              <ThemeToggle />
              <button type="button" onClick={logout} title="Sign out" aria-label="Sign out" className="p-2 rounded-lg text-fg-2 hover:bg-elevated hover:text-fg transition"><LogOut size={17} /></button>
            </div>
          )}
        </div>
      </aside>

      {/* Top bar (phones) */}
      <header className="md:hidden sticky top-0 z-30 bg-sidebar border-b border-line px-4 py-3">
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
