import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, CalendarDays, Award, Cake } from 'lucide-react'
import { api } from '../lib/api.js'
import { toast } from '../lib/toast.js'
import { Card, Pill, Button, PageHeader, Input, Modal, ConfirmDialog, Dropdown, DatePicker, Avatar } from '../components/ui.jsx'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const TABS = [
  { key: 'holidays', label: 'Holidays', icon: CalendarDays },
  { key: 'anniversaries', label: 'Work Anniversaries', icon: Award },
  { key: 'birthdays', label: 'Birthdays', icon: Cake },
]
// People who have left are not celebrated in the calendar.
const LEFT = ['resigned', 'terminated']

const pad = n => String(n).padStart(2, '0')
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const isLeap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0

// Same month/day as `iso`, moved into `year`. Feb 29 falls back to Feb 28 in non-leap years.
function inYear(iso, year) {
  const [, m, d] = iso.split('-').map(Number)
  const day = m === 2 && d === 29 && !isLeap(year) ? 28 : d
  return `${year}-${pad(m)}-${pad(day)}`
}
const NOUN = { holidays: ['holiday', 'holidays'], anniversaries: ['anniversary', 'anniversaries'], birthdays: ['birthday', 'birthdays'] }
const countLabel = (n, tab) => (n ? `${n} ${NOUN[tab][n > 1 ? 1 : 0]}` : '—')

const dayInfo = iso => {
  const dt = new Date(iso + 'T00:00:00')
  return { day: dt.getDate(), weekday: dt.toLocaleDateString('en-GB', { weekday: 'short' }), month: dt.getMonth(), weekend: dt.getDay() === 0 || dt.getDay() === 6 }
}

export default function HolidayCalendar() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [tab, setTab] = useState('holidays')
  const [holidays, setHolidays] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [confirming, setConfirming] = useState(null)

  const loadHolidays = () => api(`/holidays?year=${year}`).then(d => setHolidays(d.holidays)).catch(e => toast.error(e.message))
  useEffect(() => {
    setLoading(true)
    Promise.all([api(`/holidays?year=${year}`), api('/employees')])
      .then(([h, e]) => { setHolidays(h.holidays); setEmployees(e.employees) })
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [year])

  // Build one list per tab: { date, ...item }, sorted by date.
  const anniversaries = useMemo(() => employees
    .filter(e => e.join_date && !LEFT.includes(e.status))
    .map(e => ({ ...e, date: inYear(e.join_date, year), years: year - Number(e.join_date.slice(0, 4)) }))
    .filter(e => e.years >= 1)
    .sort((a, b) => a.date.localeCompare(b.date)), [employees, year])

  const birthdays = useMemo(() => employees
    .filter(e => e.date_of_birth && !LEFT.includes(e.status))
    .map(e => ({ ...e, date: inYear(e.date_of_birth, year) }))
    .sort((a, b) => a.date.localeCompare(b.date)), [employees, year])

  const holidayItems = useMemo(() => holidays.map(h => ({ ...h, date: h.holiday_date })), [holidays])

  const lists = { holidays: holidayItems, anniversaries, birthdays }
  const items = lists[tab]
  const byMonth = MONTHS.map((_, i) => items.filter(it => dayInfo(it.date).month === i))
  const today = todayISO()
  const currentMonth = new Date().getFullYear() === year ? new Date().getMonth() : -1

  const removeHoliday = h => setConfirming({
    title: 'Delete holiday?',
    message: `“${h.name}” on ${new Date(h.holiday_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} will be removed.`,
    confirmLabel: 'Delete holiday',
    onConfirm: async () => {
      try { await api(`/holidays/${h.id}`, { method: 'DELETE' }); toast.success(`Holiday “${h.name}” deleted.`); loadHolidays() }
      catch (e) { toast.error(e.message) }
    },
  })

  return (
    <div>
      <PageHeader title="Holiday Calendar" sub="Holidays, work anniversaries and birthdays for the year, month by month."
        actions={tab === 'holidays' && <Button variant="primary" onClick={() => setEditing({ holiday_date: '', name: '', status: 'active' })}><Plus size={16} className="inline -mt-0.5 mr-1" />Add holiday</Button>} />

      {/* Tabs + year switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="inline-flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.key
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${active ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
                <Icon size={16} />{t.label}
                <span className={`text-xs rounded-full px-1.5 py-0.5 ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{lists[t.key].length}</span>
              </button>
            )
          })}
        </div>
        <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          <button onClick={() => setYear(y => y - 1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Previous year"><ChevronLeft size={16} /></button>
          <span className="px-3 font-semibold text-slate-800 tabular-nums">Jan – Dec {year}</span>
          <button onClick={() => setYear(y => y + 1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Next year"><ChevronRight size={16} /></button>
        </div>
      </div>

      {loading ? <Card className="p-10 text-center text-slate-400">Loading…</Card> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {MONTHS.map((name, i) => (
            <Card key={name} className={`p-0 overflow-hidden ${i === currentMonth ? 'ring-2 ring-indigo-200' : ''}`}>
              <div className={`flex items-center justify-between px-4 py-2.5 border-b border-slate-100 ${i === currentMonth ? 'bg-indigo-50' : 'bg-slate-50'}`}>
                <span className="font-semibold text-slate-800">{name}</span>
                <span className="text-xs text-slate-500">{countLabel(byMonth[i].length, tab)}</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {byMonth[i].length === 0 && <li className="px-4 py-4 text-sm text-slate-400">Nothing this month</li>}
                {byMonth[i].map(it => {
                  const d = dayInfo(it.date)
                  const isToday = it.date === today
                  return (
                    <li key={`${tab}-${it.id}`} className={`flex items-center gap-3 px-4 py-2.5 ${isToday ? 'bg-amber-50' : ''}`}>
                      <div className={`w-11 shrink-0 text-center rounded-lg py-1 ${d.weekend && tab === 'holidays' ? 'bg-slate-100 text-slate-500' : 'bg-indigo-50 text-indigo-700'}`}>
                        <div className="text-base font-bold leading-none">{d.day}</div>
                        <div className="text-[10px] uppercase mt-0.5">{d.weekday}</div>
                      </div>
                      {tab !== 'holidays' && <Avatar photo={it.photo} name={it.name} size={32} />}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-slate-800 truncate">{it.name}</div>
                        <div className="text-xs text-slate-500 truncate">
                          {tab === 'holidays' && (d.weekend ? 'Falls on a weekend' : 'Weekday')}
                          {tab === 'anniversaries' && `${it.years} year${it.years > 1 ? 's' : ''} · ${it.role_name || 'No role'}`}
                          {tab === 'birthdays' && (it.role_name || 'No role')}
                        </div>
                      </div>
                      {isToday && <Pill tone="risk">Today</Pill>}
                      {tab === 'holidays' && (
                        <>
                          {!isToday && <Pill tone={it.status === 'active' ? 'ok' : 'neutral'}>{it.status === 'active' ? 'Active' : 'Inactive'}</Pill>}
                          <div className="flex shrink-0">
                            <button onClick={() => setEditing(it)} className="text-slate-400 hover:text-indigo-600 p-1" title="Edit"><Pencil size={15} /></button>
                            <button onClick={() => removeHoliday(it)} className="text-slate-400 hover:text-red-600 p-1" title="Delete"><Trash2 size={15} /></button>
                          </div>
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {editing && <HolidayForm holiday={editing} year={year} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); loadHolidays() }} />}
      {confirming && <ConfirmDialog {...confirming} onClose={() => setConfirming(null)} />}
    </div>
  )
}

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
