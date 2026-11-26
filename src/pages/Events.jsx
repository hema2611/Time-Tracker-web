import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, MapPin, Clock, Search, CalendarDays, Users, PartyPopper, CircleCheck } from 'lucide-react'
import { api, fmtDate } from '../lib/api.js'
import { toast } from '../lib/toast.js'
import { Card, Pill, Button, PageHeader, Input, Textarea, Table, Modal, ConfirmDialog, Dropdown, DatePicker, TimeSelect, MultiSelect, Avatar, fmtTime } from '../components/ui.jsx'

const STATUS = [
  { v: 'upcoming', label: 'Upcoming', tone: 'info' },
  { v: 'ongoing', label: 'Ongoing', tone: 'risk' },
  { v: 'completed', label: 'Completed', tone: 'ok' },
]
const statusMeta = v => STATUS.find(s => s.v === v) || STATUS[0]
const LEFT = ['resigned', 'terminated']
const pad = n => String(n).padStart(2, '0')

// Suggest a status from the date and times, compared with now.
function suggestStatus(date, start, end) {
  if (!date) return null
  const now = new Date()
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  if (date > today) return 'upcoming'
  if (date < today) return 'completed'
  const hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`
  if (start && hm < start) return 'upcoming'
  if (end && hm >= end) return 'completed'
  return 'ongoing'
}

const blank = { title: '', event_type_id: '', event_date: '', start_time: '', end_time: '', location: '', description: '', status: 'upcoming', employee_ids: [] }

export default function Events() {
  const [events, setEvents] = useState([])
  const [types, setTypes] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null)
  const [confirming, setConfirming] = useState(null)

  const load = () => api('/events').then(d => setEvents(d.events)).catch(e => toast.error(e.message))
  useEffect(() => {
    setLoading(true)
    Promise.all([api('/events'), api('/config?category=event_type'), api('/employees')])
      .then(([ev, t, emp]) => { setEvents(ev.events); setTypes(t.options); setEmployees(emp.employees) })
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  const empById = useMemo(() => Object.fromEntries(employees.map(e => [e.id, e])), [employees])
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
  const kpis = [
    { label: 'Total events', value: events.length, icon: PartyPopper },
    { label: 'Upcoming', value: events.filter(e => e.status === 'upcoming').length, icon: CalendarDays },
    { label: 'This month', value: events.filter(e => e.event_date?.startsWith(thisMonth)).length, icon: Clock },
    { label: 'Total participation', value: events.reduce((n, e) => n + e.employee_ids.length, 0), icon: Users },
  ]

  const shown = events.filter(e =>
    (filter === 'all' || e.status === filter) &&
    (!typeFilter || String(e.event_type_id) === String(typeFilter)) &&
    (!q.trim() || `${e.title} ${e.event_type || ''} ${e.location || ''}`.toLowerCase().includes(q.trim().toLowerCase())))

  const remove = ev => setConfirming({
    title: 'Delete event?',
    message: `“${ev.title}” and its participant list will be permanently removed.`,
    confirmLabel: 'Delete event',
    onConfirm: async () => {
      try { await api(`/events/${ev.id}`, { method: 'DELETE' }); toast.success(`Event “${ev.title}” deleted.`); load() }
      catch (e) { toast.error(e.message) }
    },
  })

  return (
    <div>
      <PageHeader title="Events" sub="Plan and record team events and who took part."
        actions={<Button variant="primary" onClick={() => setEditing({ ...blank })}><Plus size={16} className="inline -mt-0.5 mr-1" />Add event</Button>} />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {kpis.map(k => {
          const Icon = k.icon
          return (
            <Card key={k.label} className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center shrink-0"><Icon size={19} /></div>
              <div>
                <div className="text-2xl font-semibold text-slate-900 leading-none">{k.value}</div>
                <div className="text-xs text-slate-500 mt-1">{k.label}</div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="inline-flex bg-surface border border-slate-200 rounded-xl p-1 shadow-sm">
          {[{ v: 'all', label: 'All' }, ...STATUS].map(s => {
            const count = s.v === 'all' ? events.length : events.filter(e => e.status === s.v).length
            const active = filter === s.v
            return (
              <button key={s.v} onClick={() => setFilter(s.v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${active ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
                {s.label} <span className={`ml-1 text-xs ${active ? 'text-white/80' : 'text-slate-400'}`}>{count}</span>
              </button>
            )
          })}
        </div>
        <Dropdown className="w-52" value={typeFilter} onChange={setTypeFilter} placeholder="All event types"
          options={[{ value: '', label: 'All event types' }, ...types.map(t => ({ value: t.id, label: t.label }))]} />
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search events…"
            className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 bg-surface focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? <div className="p-8 text-center text-slate-400">Loading…</div>
          : shown.length === 0 ? <div className="p-10 text-center text-slate-400">{events.length ? 'No events match these filters.' : 'No events yet. Add the first one.'}</div>
          : (
            <Table head={['Event', 'Date & time', 'Venue', 'Participants', 'Status', '']}>
              {shown.map(ev => {
                const people = ev.employee_ids.map(id => empById[id]).filter(Boolean)
                return (
                  <tr key={ev.id} className="hover:bg-slate-50">
                    <td>
                      <div className="font-medium text-slate-800">{ev.title}</div>
                      <div className="text-xs text-indigo-600 font-medium mt-0.5">{ev.event_type || '—'}</div>
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="text-slate-700">{fmtDate(ev.event_date)}</div>
                      <div className="text-xs text-slate-400">{ev.start_time ? `${fmtTime(ev.start_time)} – ${fmtTime(ev.end_time)}` : '—'}</div>
                    </td>
                    <td className="text-slate-600">{ev.location ? <span className="inline-flex items-center gap-1"><MapPin size={13} className="text-slate-400" />{ev.location}</span> : '—'}</td>
                    <td>
                      {people.length === 0 ? <span className="text-slate-400">—</span> : (
                        <div className="flex items-center gap-2" title={people.map(p => p.name).join(', ')}>
                          <div className="flex -space-x-2">
                            {people.slice(0, 4).map(p => <span key={p.id} className="ring-2 ring-white rounded-full"><Avatar photo={p.photo} name={p.name} size={28} /></span>)}
                          </div>
                          <span className="text-xs text-slate-500">{people.length > 4 ? `+${people.length - 4} · ` : ''}{people.length} {people.length === 1 ? 'person' : 'people'}</span>
                        </div>
                      )}
                    </td>
                    <td><Pill tone={statusMeta(ev.status).tone}>{statusMeta(ev.status).label}</Pill></td>
                    <td className="text-right whitespace-nowrap">
                      <button onClick={() => setEditing(ev)} className="text-slate-400 hover:text-indigo-600 p-1.5" title="Edit"><Pencil size={16} /></button>
                      <button onClick={() => remove(ev)} className="text-slate-400 hover:text-red-600 p-1.5" title="Delete"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                )
              })}
            </Table>
          )}
      </Card>

      {editing && <EventForm ev={editing} types={types} employees={employees} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
      {confirming && <ConfirmDialog {...confirming} onClose={() => setConfirming(null)} />}
    </div>
  )
}

function EventForm({ ev, types, employees, onClose, onSaved }) {
  const [f, setF] = useState(() => {
    const init = { ...blank, ...ev, employee_ids: ev.employee_ids || [] }
    for (const k of Object.keys(blank)) if (init[k] == null) init[k] = k === 'employee_ids' ? [] : ''
    return init
  })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  // Status follows the date/time automatically until the user picks one themselves.
  const [statusTouched, setStatusTouched] = useState(!!ev.id)
  const set = (k, v) => { setF(s => ({ ...s, [k]: v })); setErrors(e => (e[k] ? { ...e, [k]: undefined } : e)) }

  useEffect(() => {
    if (statusTouched) return
    const s = suggestStatus(f.event_date, f.start_time, f.end_time)
    if (s && s !== f.status) setF(x => ({ ...x, status: s }))
  }, [f.event_date, f.start_time, f.end_time])

  // Pre-fill the title from the event type when it is still empty.
  const pickType = v => {
    const t = types.find(x => String(x.id) === String(v))
    setF(s => ({ ...s, event_type_id: v, title: s.title.trim() ? s.title : (t?.label || '') }))
    setErrors(e => ({ ...e, event_type_id: undefined, title: undefined }))
  }

  const people = employees.filter(e => !LEFT.includes(e.status) || f.employee_ids.some(id => String(id) === String(e.id)))
  const suggested = suggestStatus(f.event_date, f.start_time, f.end_time)

  const submit = async e => {
    e.preventDefault()
    const errs = {}
    if (!f.title.trim()) errs.title = 'Event title is required.'
    if (!f.event_type_id) errs.event_type_id = 'Select an event type.'
    if (!f.event_date) errs.event_date = 'Pick the event date.'
    if (!f.start_time) errs.start_time = 'Pick a start time.'
    if (!f.end_time) errs.end_time = 'Pick an end time.'
    else if (f.start_time && f.end_time <= f.start_time) errs.end_time = 'End time must be after start time.'
    if (!f.employee_ids.length) errs.employee_ids = 'Select at least one participant.'
    if (Object.keys(errs).length) { setErrors(errs); toast.error('Please fix the highlighted fields.'); return }
    setBusy(true)
    try {
      if (ev.id) { await api(`/events/${ev.id}`, { method: 'PUT', body: f }); toast.success(`Event “${f.title}” updated.`) }
      else { await api('/events', { method: 'POST', body: f }); toast.success(`Event “${f.title}” added.`) }
      onSaved()
    } catch (x) { setBusy(false); toast.error(x.message) }
  }

  return (
    <Modal title={ev.id ? 'Edit event' : 'Add event'} sub="Event details, timing and who took part." onClose={onClose} size="max-w-3xl">
      <form onSubmit={submit} noValidate className="flex flex-col max-h-[80vh]">
        <div className="p-6 space-y-5 overflow-y-auto">
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-4">
            <Dropdown label="Event type" req value={f.event_type_id} error={errors.event_type_id} onChange={pickType} placeholder="Select event type"
              options={types.map(t => ({ value: t.id, label: t.label }))} />
            <Input label="Event title" req value={f.title} error={errors.title} onChange={e => set('title', e.target.value)} placeholder="e.g. December Fun Friday" />
            <DatePicker label="Event date" req value={f.event_date} error={errors.event_date} onChange={v => set('event_date', v)} />
            <Input label="Venue / location" value={f.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Cafeteria, 3rd floor" />
            <TimeSelect label="Start time" req value={f.start_time} error={errors.start_time} onChange={v => set('start_time', v)} />
            <TimeSelect label="End time" req value={f.end_time} error={errors.end_time} onChange={v => set('end_time', v)} />
            <Dropdown label="Status" req value={f.status} onChange={v => { setStatusTouched(true); set('status', v) }}
              hint={!statusTouched && suggested ? 'Set automatically from the date and time' : (suggested && suggested !== f.status ? `Suggested: ${statusMeta(suggested).label}` : undefined)}
              options={STATUS.map(s => ({ value: s.v, label: s.label }))} />
          </div>

          <MultiSelect label="Participants" req value={f.employee_ids} error={errors.employee_ids} onChange={v => set('employee_ids', v)}
            placeholder="Select employees" hint="Employees who attended (or are invited to) this event."
            options={people.map(e => ({ value: e.id, label: e.name, sub: e.role_name || e.emp_no }))} />

          <Textarea label="Description / notes" value={f.description} onChange={e => set('description', e.target.value)} placeholder="Agenda, highlights, games played, food ordered…" />

          {f.status === 'completed' && f.employee_ids.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
              <CircleCheck size={16} />{f.employee_ids.length} {f.employee_ids.length === 1 ? 'person' : 'people'} will be recorded as having attended.
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-surface rounded-b-2xl">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Saving…' : 'Save event'}</Button>
        </div>
      </form>
    </Modal>
  )
}
