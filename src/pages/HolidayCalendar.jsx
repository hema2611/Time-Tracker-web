import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, CalendarDays, Award, Cake, LayoutGrid, List } from 'lucide-react'
import { api } from '../lib/api.js'
import { toast } from '../lib/toast.js'
import { Card, Pill, Button, PageHeader, Input, Modal, ConfirmDialog, Dropdown, DatePicker, Avatar, MonthPicker } from '../components/ui.jsx'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
// People who have left are not celebrated in the calendar.
const LEFT = ['resigned', 'terminated']

// One colour per kind, used for dots, chips, cell tints and kanban columns.
const KINDS = {
  holiday: { label: 'Holidays', one: 'Holiday', icon: CalendarDays, dot: 'bg-amber-600', chip: 'bg-amber-100 text-amber-700', soft: 'bg-amber-50', ring: 'ring-amber-300' },
  birthday: { label: 'Birthdays', one: 'Birthday', icon: Cake, dot: 'bg-rose-500', chip: 'bg-rose-50 text-rose-500', soft: 'bg-rose-50', ring: 'ring-rose-300' },
  anniversary: { label: 'Work Anniversaries', one: 'Work anniversary', icon: Award, dot: 'bg-green-600', chip: 'bg-green-100 text-green-700', soft: 'bg-green-50', ring: 'ring-green-200' },
}
const ORDER = ['holiday', 'birthday', 'anniversary']

const pad = n => String(n).padStart(2, '0')
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`
const todayISO = () => { const d = new Date(); return iso(d.getFullYear(), d.getMonth(), d.getDate()) }
const isLeap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
const asDate = s => new Date(s + 'T00:00:00')
const longDate = s => asDate(s).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

// Same month/day as `src`, moved into `year`. Feb 29 falls back to Feb 28 in non-leap years.
function inYear(src, year) {
  const [, m, d] = src.split('-').map(Number)
  return `${year}-${pad(m)}-${pad(m === 2 && d === 29 && !isLeap(year) ? 28 : d)}`
}

// Every calendar item for one year: { kind, key, date, title, sub, photo, holiday? }.
function buildItems(year, holidays, employees) {
  const out = []
  for (const h of holidays) {
    out.push({ kind: 'holiday', key: `h${h.id}`, date: h.holiday_date, title: h.name, sub: h.status === 'active' ? null : 'Inactive', inactive: h.status !== 'active', holiday: h })
  }
  for (const e of employees) {
    if (LEFT.includes(e.status)) continue
    if (e.date_of_birth) out.push({ kind: 'birthday', key: `b${e.id}`, date: inYear(e.date_of_birth, year), title: e.name, sub: e.role_name || 'No role', photo: e.photo })
    if (e.join_date) {
      const years = year - Number(e.join_date.slice(0, 4))
      if (years >= 1) out.push({ kind: 'anniversary', key: `a${e.id}`, date: inYear(e.join_date, year), title: e.name, sub: `${years} year${years > 1 ? 's' : ''} · ${e.role_name || 'No role'}`, photo: e.photo, years })
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || a.title.localeCompare(b.title))
}

export default function HolidayCalendar() {
  const now = new Date()
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [view, setView] = useState(() => localStorage.getItem('cal.view') || 'month')
  const [show, setShow] = useState({ holiday: true, birthday: true, anniversary: true })
  const [holidays, setHolidays] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [confirming, setConfirming] = useState(null)
  useEffect(() => { localStorage.setItem('cal.view', view) }, [view])

  const year = cursor.y
  const loadHolidays = () => api(`/holidays?year=${year}`).then(d => setHolidays(d.holidays)).catch(e => toast.error(e.message))
  useEffect(() => { api('/employees').then(d => setEmployees(d.employees)).catch(e => toast.error(e.message)) }, [])
  useEffect(() => {
    setLoading(true)
    api(`/holidays?year=${year}`).then(d => setHolidays(d.holidays)).catch(e => toast.error(e.message)).finally(() => setLoading(false))
  }, [year])

  const all = useMemo(() => buildItems(year, holidays, employees), [year, holidays, employees])
  const visible = all.filter(it => show[it.kind])
  const monthPrefix = `${year}-${pad(cursor.m + 1)}`
  const monthItems = visible.filter(it => it.date.startsWith(monthPrefix))
  const scope = view === 'month' ? all.filter(it => it.date.startsWith(monthPrefix)) : all
  const counts = Object.fromEntries(ORDER.map(k => [k, scope.filter(it => it.kind === k).length]))

  const shift = n => setCursor(c => {
    if (view === 'year') return { ...c, y: c.y + n }
    const d = new Date(c.y, c.m + n, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const goToday = () => setCursor({ y: now.getFullYear(), m: now.getMonth() })
  const isCurrent = view === 'year' ? year === now.getFullYear() : year === now.getFullYear() && cursor.m === now.getMonth()

  const addOn = date => setEditing({ holiday_date: date || '', name: '', status: 'active' })
  const removeHoliday = h => setConfirming({
    title: 'Delete holiday?',
    message: `“${h.name}” on ${asDate(h.holiday_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} will be removed.`,
    confirmLabel: 'Delete holiday',
    onConfirm: async () => {
      try { await api(`/holidays/${h.id}`, { method: 'DELETE' }); toast.success(`Holiday “${h.name}” deleted.`); loadHolidays() }
      catch (e) { toast.error(e.message) }
    },
  })
  const actions = { edit: h => setEditing(h), remove: removeHoliday }

  return (
    <div>
      <PageHeader title="Holiday Calendar" sub="Holidays, birthdays and work anniversaries at a glance."
        actions={<Button variant="primary" onClick={() => addOn('')}><Plus size={16} className="inline -mt-0.5 mr-1" />Add holiday</Button>} />

      {/* Toolbar: period navigation · filters · view switch */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="inline-flex items-center gap-1 bg-surface border border-slate-200 rounded-xl p-1 shadow-sm">
          <button onClick={() => shift(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" aria-label={view === 'year' ? 'Previous year' : 'Previous month'}><ChevronLeft size={16} /></button>
          {view === 'month'
            ? <MonthPicker value={cursor} onChange={setCursor} />
            : <span className="px-3 py-1.5 font-semibold text-slate-800 tabular-nums">Jan – Dec {year}</span>}
          <button onClick={() => shift(1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" aria-label={view === 'year' ? 'Next year' : 'Next month'}><ChevronRight size={16} /></button>
          <button onClick={goToday} disabled={isCurrent} className="ml-1 px-2.5 py-1.5 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:text-slate-400 disabled:hover:bg-transparent">Today</button>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
          {ORDER.map(k => {
            const K = KINDS[k]
            const on = show[k]
            return (
              <button key={k} onClick={() => setShow(s => ({ ...s, [k]: !s[k] }))} aria-pressed={on} title={on ? `Hide ${K.label.toLowerCase()}` : `Show ${K.label.toLowerCase()}`}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${on ? `${K.chip} border-transparent` : 'border-slate-200 text-slate-400 line-through decoration-1'}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${on ? K.dot : 'bg-slate-300'}`} />{K.label}
                <span className="tabular-nums text-xs opacity-80">{counts[k]}</span>
              </button>
            )
          })}
        </div>

        <div className="ml-auto inline-flex bg-surface border border-slate-200 rounded-xl p-1 shadow-sm">
          {[{ v: 'month', label: 'Month', icon: LayoutGrid }, { v: 'year', label: 'Year list', icon: List }].map(o => {
            const Icon = o.icon
            return (
              <button key={o.v} onClick={() => setView(o.v)} aria-pressed={view === o.v}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${view === o.v ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
                <Icon size={15} />{o.label}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? <Card className="p-10 text-center text-slate-400">Loading…</Card>
        : view === 'month'
          ? (<>
              <MonthKanban y={year} m={cursor.m} items={monthItems} show={show} actions={actions} />
              <MonthGrid y={year} m={cursor.m} items={monthItems} onAdd={addOn} />
            </>)
          : <YearList year={year} items={visible} actions={actions} />}

      {editing && <HolidayForm holiday={editing} year={year} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); loadHolidays() }} />}
      {confirming && <ConfirmDialog {...confirming} onClose={() => setConfirming(null)} />}
    </div>
  )
}

/* ---------- Month view: calendar grid with hover details ---------- */

function MonthGrid({ y, m, items, onAdd }) {
  const today = todayISO()
  const first = new Date(y, m, 1).getDay()
  const days = new Date(y, m + 1, 0).getDate()
  const prevDays = new Date(y, m, 0).getDate()
  const total = Math.ceil((first + days) / 7) * 7
  const rows = total / 7
  // Inactive holidays stay in the lists but are not painted on the calendar.
  const byDate = {}
  for (const it of items) if (!it.inactive) (byDate[it.date] ||= []).push(it)

  const cells = Array.from({ length: total }, (_, i) => {
    const d = i - first + 1
    if (d < 1) return { out: true, label: prevDays + d }
    if (d > days) return { out: true, label: d - days }
    return { date: iso(y, m, d), label: d }
  })

  return (
    <Card className="p-0 overflow-visible">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-800">{MONTHS[m]} {y}</h2>
        <span className="text-xs text-slate-500">Hover a coloured date for details · <Plus size={11} className="inline -mt-0.5" /> adds a holiday</span>
      </div>
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/60">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-center ${i === 0 || i === 6 ? 'text-slate-400' : 'text-slate-500'}`}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((c, i) => {
          const col = i % 7, row = Math.floor(i / 7)
          const corner = i === total - 7 ? 'rounded-bl-2xl' : i === total - 1 ? 'rounded-br-2xl' : ''
          const edge = `${col < 6 ? 'border-r' : ''} ${row < rows - 1 ? 'border-b' : ''} border-slate-100 ${corner}`
          if (c.out) return <div key={`o${i}`} className={`h-14 sm:h-[84px] p-1.5 text-xs text-slate-300 bg-slate-50/50 ${edge}`}><span className="inline-grid place-items-center w-6 h-6">{c.label}</span></div>

          const list = byDate[c.date] || []
          const isToday = c.date === today
          const weekend = col === 0 || col === 6
          const lead = list[0] && KINDS[list[0].kind]
          // Popover: open below on the top half of the grid, above on the bottom half; hug the side columns.
          const vpos = row < rows / 2 ? 'top-full mt-1' : 'bottom-full mb-1'
          const hpos = col <= 1 ? 'left-0' : col >= 5 ? 'right-0' : 'left-1/2 -translate-x-1/2'

          return (
            <div key={c.date} tabIndex={list.length ? 0 : -1}
              aria-label={list.length ? `${longDate(c.date)}: ${list.map(it => `${KINDS[it.kind].one} — ${it.title}`).join('; ')}` : undefined}
              className={`group relative h-14 sm:h-[84px] p-1.5 outline-none transition ${edge}
                ${list.length ? `${lead.soft} hover:z-20 focus:z-20 focus-visible:ring-2 ${lead.ring} ring-inset` : weekend ? 'bg-slate-50/70' : 'hover:bg-slate-50/60'}`}>
              <div className="flex items-center justify-between">
                <span className={`inline-grid place-items-center w-6 h-6 rounded-full text-xs tabular-nums
                  ${isToday ? 'bg-indigo-600 text-white font-semibold' : list.length ? 'font-semibold text-slate-800' : weekend ? 'text-slate-400' : 'text-slate-600'}`}>{c.label}</span>
                <button type="button" onClick={() => onAdd(c.date)} title="Add a holiday on this date" aria-label={`Add a holiday on ${longDate(c.date)}`}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-surface transition">
                  <Plus size={13} />
                </button>
              </div>

              {/* Chips (desktop) / dots (phone) */}
              <div className="hidden sm:block mt-1 space-y-0.5">
                {list.slice(0, list.length > 2 ? 1 : 2).map(it => (
                  <div key={it.key} className={`flex items-center gap-1 rounded px-1.5 py-px text-[11px] font-medium leading-4 truncate ${KINDS[it.kind].chip}`}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${KINDS[it.kind].dot}`} /><span className="truncate">{it.title}</span>
                  </div>
                ))}
                {list.length > 2 && <div className="text-[11px] font-medium leading-4 text-slate-500 px-1">+{list.length - 1} more</div>}
              </div>
              <div className="sm:hidden flex gap-1 mt-1 flex-wrap">
                {list.map(it => <span key={it.key} className={`w-2 h-2 rounded-full ${KINDS[it.kind].dot}`} />)}
              </div>

              {/* Hover / focus details */}
              {list.length > 0 && (
                <div role="tooltip" className={`pointer-events-none absolute ${vpos} ${hpos} z-30 w-64 rounded-xl border border-slate-200 bg-surface shadow-pop p-3
                  opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus:opacity-100 group-focus:visible transition`}>
                  <div className="text-xs font-semibold text-slate-500 mb-2">{longDate(c.date)}{isToday && <span className="text-indigo-600"> · Today</span>}</div>
                  <ul className="space-y-2">
                    {list.map(it => {
                      const K = KINDS[it.kind]
                      const Icon = K.icon
                      return (
                        <li key={it.key} className="flex items-center gap-2.5">
                          {it.kind === 'holiday'
                            ? <span className={`w-8 h-8 rounded-full grid place-items-center shrink-0 ${K.chip}`}><Icon size={15} /></span>
                            : <Avatar photo={it.photo} name={it.title} size={32} />}
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-800 truncate">{it.title}</div>
                            <div className="text-xs text-slate-500 truncate flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${K.dot}`} />{K.one}{it.kind === 'anniversary' ? ` · ${it.years} yr${it.years > 1 ? 's' : ''}` : ''}
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/* ---------- Month view: kanban of the month ---------- */

function MonthKanban({ y, m, items, show, actions }) {
  const today = todayISO()
  const cols = ORDER.filter(k => show[k])
  if (!cols.length) return null
  return (
    <div className="mb-6">
      <h2 className="text-base font-semibold text-slate-800 mb-3">{MONTHS[m]} {y} at a glance</h2>
      <div className={`grid gap-4 ${cols.length === 3 ? 'lg:grid-cols-3' : cols.length === 2 ? 'md:grid-cols-2' : ''}`}>
        {cols.map(k => {
          const K = KINDS[k]
          const Icon = K.icon
          const list = items.filter(it => it.kind === k)
          return (
            <Card key={k} className="p-0 overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200">
                <span className={`w-7 h-7 rounded-lg grid place-items-center ${K.chip}`}><Icon size={15} /></span>
                <span className="font-semibold text-slate-800">{K.label}</span>
                <span className="ml-auto text-xs font-semibold rounded-full px-2 py-0.5 bg-slate-100 text-slate-600 tabular-nums">{list.length}</span>
              </div>
              {/* Capped height so a busy month never pushes the calendar far down. */}
              <div className="p-2.5 space-y-2 flex-1 bg-slate-50/40 max-h-[232px] overflow-y-auto">
                {list.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No {K.label.toLowerCase()} in {MONTHS[m]}</p>}
                {list.map(it => <ItemCard key={it.key} it={it} isToday={it.date === today} actions={actions} />)}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function ItemCard({ it, isToday, actions }) {
  const K = KINDS[it.kind]
  const dt = asDate(it.date)
  return (
    <div className={`flex items-center gap-3 rounded-xl border bg-surface px-3 py-2.5 ${isToday ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200'} ${it.inactive ? 'opacity-60' : ''}`}>
      <div className={`w-11 shrink-0 text-center rounded-lg py-1 ${K.chip}`}>
        <div className="text-base font-bold leading-none tabular-nums">{dt.getDate()}</div>
        <div className="text-[10px] uppercase mt-0.5">{dt.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
      </div>
      {it.kind !== 'holiday' && <Avatar photo={it.photo} name={it.title} size={32} />}
      <div className="min-w-0 flex-1">
        <div className="font-medium text-slate-800 truncate">{it.title}</div>
        <div className="text-xs text-slate-500 truncate">
          {it.kind === 'holiday' ? ([0, 6].includes(dt.getDay()) ? 'Falls on a weekend' : 'Weekday') : it.sub}
        </div>
      </div>
      {isToday && <Pill tone="risk">Today</Pill>}
      {it.kind === 'holiday' && (
        <div className="flex items-center shrink-0">
          {it.inactive && <Pill tone="neutral">Inactive</Pill>}
          <button onClick={() => actions.edit(it.holiday)} className="text-slate-400 hover:text-indigo-600 p-1" title="Edit holiday"><Pencil size={15} /></button>
          <button onClick={() => actions.remove(it.holiday)} className="text-slate-400 hover:text-red-600 p-1" title="Delete holiday"><Trash2 size={15} /></button>
        </div>
      )}
    </div>
  )
}

/* ---------- Year view: the whole year as a list ---------- */

function YearList({ year, items, actions }) {
  const today = todayISO()
  const nowMonth = new Date().getFullYear() === year ? new Date().getMonth() : -1
  if (!items.length) return <Card className="p-10 text-center text-slate-400">Nothing to show for {year}.</Card>
  return (
    <Card className="p-0 overflow-hidden">
      {MONTHS.map((name, mi) => {
        const list = items.filter(it => asDate(it.date).getMonth() === mi)
        return (
          <section key={name} className="border-b border-slate-200 last:border-b-0">
            <div className={`flex items-center gap-3 px-4 py-2.5 ${mi === nowMonth ? 'bg-indigo-50' : 'bg-slate-50'}`}>
              <h3 className="font-semibold text-slate-800">{name}</h3>
              {mi === nowMonth && <Pill tone="info">This month</Pill>}
              <div className="ml-auto flex gap-1.5">
                {ORDER.map(k => {
                  const n = list.filter(it => it.kind === k).length
                  return n ? <span key={k} className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 ${KINDS[k].chip}`}><span className={`w-1.5 h-1.5 rounded-full ${KINDS[k].dot}`} />{n}</span> : null
                })}
              </div>
            </div>
            {list.length === 0
              ? <p className="px-4 py-3 text-sm text-slate-400">Nothing this month</p>
              : (
                <ul className="divide-y divide-slate-100">
                  {list.map(it => {
                    const K = KINDS[it.kind]
                    const dt = asDate(it.date)
                    const isToday = it.date === today
                    return (
                      <li key={it.key} className={`grid grid-cols-[4.5rem_1fr_auto] sm:grid-cols-[6.5rem_9.5rem_1fr_auto] items-center gap-3 px-4 py-2.5 ${isToday ? 'bg-amber-50' : 'hover:bg-slate-50'} ${it.inactive ? 'opacity-60' : ''}`}>
                        <div className="tabular-nums">
                          <span className="font-semibold text-slate-800">{dt.getDate()} {MONTHS[mi].slice(0, 3)}</span>
                          <span className="block text-xs text-slate-500">{dt.toLocaleDateString('en-GB', { weekday: 'long' })}</span>
                        </div>
                        <span className={`hidden sm:inline-flex w-fit items-center gap-1.5 text-xs font-medium rounded-full px-2 py-0.5 ${K.chip}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${K.dot}`} />{K.one}
                        </span>
                        <div className="flex items-center gap-2.5 min-w-0">
                          {it.kind !== 'holiday' && <Avatar photo={it.photo} name={it.title} size={28} />}
                          <div className="min-w-0">
                            <div className="font-medium text-slate-800 truncate">{it.title}</div>
                            <div className="text-xs text-slate-500 truncate sm:hidden">{K.one}{it.sub ? ` · ${it.sub}` : ''}</div>
                            {it.sub && <div className="text-xs text-slate-500 truncate hidden sm:block">{it.sub}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 justify-end">
                          {isToday && <Pill tone="risk">Today</Pill>}
                          {it.kind === 'holiday' && (<>
                            <button onClick={() => actions.edit(it.holiday)} className="text-slate-400 hover:text-indigo-600 p-1" title="Edit holiday"><Pencil size={15} /></button>
                            <button onClick={() => actions.remove(it.holiday)} className="text-slate-400 hover:text-red-600 p-1" title="Delete holiday"><Trash2 size={15} /></button>
                          </>)}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
          </section>
        )
      })}
    </Card>
  )
}

/* ---------- Add / edit holiday ---------- */

function HolidayForm({ holiday, year, onClose, onSaved }) {
  const [f, setF] = useState({ holiday_date: holiday.holiday_date || '', name: holiday.name || '', status: holiday.status || 'active' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k, v) => { setF(s => ({ ...s, [k]: v })); setErrors(e => (e[k] ? { ...e, [k]: undefined } : e)) }

  const submit = async e => {
    e.preventDefault()
    const errs = {}
    if (!f.holiday_date) errs.holiday_date = 'Pick the holiday date.'
    if (!f.name.trim()) errs.name = 'Holiday name is required.'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setBusy(true)
    try {
      if (holiday.id) { await api(`/holidays/${holiday.id}`, { method: 'PUT', body: f }); toast.success(`Holiday “${f.name}” updated.`) }
      else { await api('/holidays', { method: 'POST', body: f }); toast.success(`Holiday “${f.name}” added.`) }
      onSaved()
    } catch (x) { setBusy(false); toast.error(x.message) }
  }

  return (
    <Modal title={holiday.id ? 'Edit holiday' : 'Add holiday'} sub="Pick the date and name the festival or occasion." onClose={onClose} size="max-w-md">
      <form onSubmit={submit} noValidate className="p-5 space-y-4">
        <DatePicker label="Date" req value={f.holiday_date} error={errors.holiday_date} onChange={v => set('holiday_date', v)} minYear={year - 5} maxYear={year + 5} />
        <Input label="Holiday / festival name" req value={f.name} error={errors.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Pongal, Diwali, Christmas" />
        <Dropdown label="Status" value={f.status} onChange={v => set('status', v)}
          options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  )
}
