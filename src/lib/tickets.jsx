// Shared labels and colours for the Ticketing System (theme.css colours only).
import { toDate } from './api.js'
import { Bug, Repeat, Sparkles, TrendingUp, CheckSquare } from 'lucide-react'

export const STATUSES = [
  { v: 'open', label: 'Open', col: 'bg-indigo-50', dot: 'bg-indigo-500', pill: 'bg-indigo-100 text-indigo-700' },
  { v: 'in_progress', label: 'In Progress', col: 'bg-amber-50', dot: 'bg-amber-600', pill: 'bg-amber-100 text-amber-700' },
  { v: 'in_testing', label: 'In Testing', col: 'bg-green-50', dot: 'bg-green-500', pill: 'bg-green-100 text-green-700' },
  { v: 'completed', label: 'Completed', col: 'bg-slate-50', dot: 'bg-slate-500', pill: 'bg-slate-100 text-slate-700' },
]
export const STATUS = Object.fromEntries(STATUSES.map(s => [s.v, s]))

export const TYPES = {
  bug: { label: 'Bug', icon: Bug, cls: 'bg-red-50 text-red-700' },
  change: { label: 'Change', icon: Repeat, cls: 'bg-indigo-50 text-indigo-700' },
  feature: { label: 'Feature', icon: Sparkles, cls: 'bg-indigo-100 text-indigo-700' },
  improvement: { label: 'Improvement', icon: TrendingUp, cls: 'bg-green-50 text-green-700' },
  task: { label: 'Task', icon: CheckSquare, cls: 'bg-slate-100 text-slate-700' },
}
export const PRIORITIES = {
  low: { label: 'Low', cls: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Medium', cls: 'bg-amber-50 text-amber-700' },
  high: { label: 'High', cls: 'bg-red-50 text-red-600' },
  critical: { label: 'Critical', cls: 'bg-red-100 text-red-700' },
}
export const REPORTERS = { client: 'Client', internal_testing: 'Internal testing team', internal_team: 'Internal team' }

export const dur = s => {
  s = Math.max(0, Math.round(s || 0))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h ? `${h} h ${m} m` : m ? `${m} m` : `${s % 60} s`
}
export const clock = s => {
  s = Math.max(0, Math.floor(s || 0))
  const p = n => String(n).padStart(2, '0')
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`
}
// DB datetimes come as "YYYY-MM-DD HH:MM:SS" in UTC; shown in local time.
export const fmtDT = v => {
  if (!v) return '–'
  const d = toDate(v)
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
}

export const TypeTag = ({ type }) => {
  const t = TYPES[type] || TYPES.task
  return <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${t.cls}`}><t.icon size={12} />{t.label}</span>
}
export const PriorityTag = ({ priority }) => {
  const p = PRIORITIES[priority] || PRIORITIES.medium
  return <span className={`inline-block rounded-md px-1.5 py-0.5 text-xs font-medium ${p.cls}`}>{p.label}</span>
}
export const StatusTag = ({ status }) => {
  const s = STATUS[status] || STATUSES[0]
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${s.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}</span>
}
