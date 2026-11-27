import { Fragment, useEffect, useState } from 'react'
import { RefreshCw, Monitor, Download, ShieldAlert, Sparkles, Puzzle, MapPin } from 'lucide-react'
import { api } from '../lib/api.js'
import { useAuth } from '../auth.jsx'
import { Card, Pill, PageHeader, Table, Button, Chip, StatusDot, Avatar, KpiCard, Drawer, ProgressRing, Skeleton, EmptyState } from '../components/ui.jsx'

// Attendance (DESIGN.md §8, design/tracker-light-prototype.html). Hours and breaks come from the desktop agent.
const KIND = {
  // Status colours (DESIGN.md §6): at desk ok, away work away, idle idle, break brk, offline off.
  work: { bar: 'bg-ok', tone: 'ok', label: 'At desk' },
  away_work: { bar: 'bg-away', tone: 'away', label: 'Away work' },
  idle: { bar: 'bg-idle', tone: 'idle', label: 'Idle' },
  break: { bar: 'bg-brk', tone: 'brk', label: 'Break' },
  offline: { bar: 'bg-off', tone: 'off', label: 'Offline' },
}

const time = s => s ? new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '–'
// Time away: breaks, offline time, and work away from the desk (a meeting the person told the agent about).
const away = p => p.kind !== 'work'
const unpTitle = list => (list || []).map(u => `${u.label} ${hm(u.minutes)}${u.duringWorkMinutes ? ` (${hm(u.duringWorkMinutes)} while working)` : ''}`).join('\n')
// Check-in / check-out place, from whatever the agent could get (office network, Wi-Fi name, exact place).
const placeLine = p => !p ? '' : [p.place ? (p.label ? `${p.place} · ${p.label}` : p.place) : null, p.wifi ? `Wi-Fi ${p.wifi}` : null].filter(Boolean).join(' · ')
const MapLink = ({ p }) => p?.lat !== undefined
  ? <a className="underline" href={`https://www.google.com/maps?q=${p.lat},${p.lon}`} target="_blank" rel="noreferrer" title={`Accuracy about ${p.acc} m`}>map</a> : null
const Place = ({ p }) => (!p ? null : <span>{placeLine(p) || 'Location not available'}{p.lat !== undefined && <> · <MapLink p={p} /></>}</span>)
const hm = m => m == null ? '–' : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`

// One day as a 38px bar: segments by status colour, hover for details, "Last seen" marker, axis fitted to the day.
function DayBar({ pieces, lastSeen }) {
  if (!pieces.length) return <div className="h-[38px] rounded-md bg-surface-2 grid place-items-center text-xs text-fg-3">No activity recorded</div>
  const H = 3600 * 1000
  const first = Date.parse(pieces[0].start), last = Date.parse(pieces[pieces.length - 1].end)
  // Whole hours around the worked time (at least 4 hours wide).
  let from = Math.floor(first / H) * H, to = Math.ceil(last / H) * H
  if (to - from < 4 * H) to = from + 4 * H
  const pct = t => ((t - from) / (to - from)) * 100
  const hours = []
  for (let t = from; t <= to; t += H) hours.push(t)
  const step = hours.length > 12 ? 2 : 1
  const seen = lastSeen && Date.parse(lastSeen)
  return (
    <div>
      <div className="relative h-[38px] rounded-md bg-surface-2">
        <div className="absolute inset-0 rounded-md overflow-hidden">
          {pieces.map((p, i) => (
            <div key={i} className={`group absolute top-0 bottom-0 ${KIND[p.kind].bar}`}
              style={{ left: `${pct(Date.parse(p.start))}%`, width: `${Math.max(pct(Date.parse(p.end)) - pct(Date.parse(p.start)), 0.3)}%` }}
              title={`${KIND[p.kind].label}${p.reason ? ` (${p.reason})` : ''} · ${time(p.start)}–${time(p.end)}`} />
          ))}
        </div>
        {seen && seen >= from && seen <= to && (
          <div className="absolute -top-1.5 -bottom-1.5 w-0.5 bg-fg" style={{ left: `${pct(seen)}%` }}>
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] text-fg-2 whitespace-nowrap">Last seen</span>
          </div>
        )}
      </div>
      <div className="relative h-5 mt-1.5 text-[11px] text-fg-3">
        {hours.map((t, i) => i % step === 0 && (
          <span key={t} className={`absolute whitespace-nowrap ${i === 0 ? '' : i === hours.length - 1 ? '-translate-x-full' : '-translate-x-1/2'}`} style={{ left: `${pct(t)}%` }}>
            {new Date(t).toLocaleTimeString([], { hour: 'numeric' })}
          </span>
        ))}
      </div>
    </div>
  )
}

// The 9-hour office day as a thin gradient ring.
function DayRing({ d, size = 128 }) {
  const target = d.officeDayMinutes || 540
  const done = d.workMinutes >= target
  return (
    <ProgressRing value={d.workMinutes / target} size={size}>
      <div className="font-display font-light text-2xl text-fg">{hm(d.workMinutes)}</div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-fg-3">of {Math.round(target / 60)}h day</div>
      <div className={`text-[11px] mt-0.5 ${done ? 'text-ok' : 'text-fg-3'}`}>{done ? 'Day complete' : `${hm(d.remainingMinutes)} left`}</div>
    </ProgressRing>
  )
}

const EXT = { on: ['ok', 'Extension on'], off: ['late', 'Extension off'], other: ['risk', 'Unsupported browser'] }

// Where the day's time went: one proportional bar and short "● Label 1h 15m" chips. Zero values fade out.
function TimeSplit({ d }) {
  const parts = [
    { key: 'desk', label: 'At desk', min: d.deskWorkMinutes, bar: 'bg-ok',
      tip: 'Working at the computer' },
    { key: 'away', label: 'Away work', min: d.awayWorkMinutes, bar: 'bg-away',
      tip: d.awayWork?.length ? d.awayWork.map(a => `${a.reason} ${hm(a.minutes)}`).join(', ') : 'Meetings, calls, work away from the desk' },
    { key: 'idle', label: 'Idle', min: d.idleMinutes, bar: 'bg-idle', tip: 'PC on, no activity', warn: d.idleMinutes > 60 },
    { key: 'break', label: 'Breaks', min: d.breakMinutes, bar: 'bg-brk', tip: 'Locked or away', warn: d.breakMinutes > 90 },
    { key: 'off', label: 'Offline', min: d.offlineMinutes, bar: 'bg-off', tip: 'Agent off or PC off during the day', warn: d.offlineMinutes > 0 },
  ]
  const total = parts.reduce((s, p) => s + p.min, 0)
  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden bg-surface-2">
        {total > 0 && parts.filter(p => p.min > 0).map(p => (
          <div key={p.key} className={p.bar} style={{ width: `${(p.min / total) * 100}%` }} title={`${p.label} ${hm(p.min)}`} />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        {parts.map(p => (
          <span key={p.key} title={p.tip} className={`inline-flex items-center gap-1.5 ${p.min ? 'text-fg' : 'text-fg-3 opacity-60'}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${p.bar}`} />
            {p.label} <b className={`font-mono ${p.warn ? 'text-amber-700' : ''}`}>{hm(p.min)}</b>
          </span>
        ))}
      </div>
    </div>
  )
}

// Day / Month switch shown in the page header of both views.
function Tabs({ tab, setTab, admin }) {
  return (
    <div className="flex rounded-md border border-line bg-surface p-1 gap-0.5" role="tablist">
      {[['day', 'Day'], ['month', 'Month'], ...(admin ? [['rules', 'Site rules']] : [])].map(([k, l]) => (
        <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
          className={`px-3 py-1.5 rounded-md text-sm transition duration-150 ${tab === k ? 'bg-violet-tint text-violet-strong font-medium' : 'text-fg-2 hover:text-fg'}`}>{l}</button>
      ))}
    </div>
  )
}

export default function Attendance() {
  const { user } = useAuth()
  const [tab, setTab] = useState('day')
  const tabs = <Tabs tab={tab} setTab={setTab} admin={user.role === 'admin'} />
  return tab === 'day' ? <DayView tabs={tabs} /> : tab === 'month' ? <MonthView tabs={tabs} /> : <RulesView tabs={tabs} />
}

// Month: totals per person and one row per day worked; downloadable as Excel.
function MonthView({ tabs }) {
  const [month, setMonth] = useState('')
  const [data, setData] = useState(null)
  const [open, setOpen] = useState(null) // person whose days are shown
  const [err, setErr] = useState('')
  useEffect(() => {
    setErr('')
    api(`/attendance/month${month ? `?month=${month}` : ''}`)
      .then(d => { setData(d); if (!month) setMonth(d.month); if (d.people.length === 1) setOpen(d.people[0].userId) })
      .catch(e => setErr(e.message))
  }, [month])

  const label = month && new Date(`${month}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  return (
    <>
      <PageHeader title="Attendance" sub={`Month report${label ? ` · ${label}` : ''}`}
        actions={<>
          {tabs}
          <input type="month" value={month} max={data?.today.slice(0, 7)} onChange={e => e.target.value && setMonth(e.target.value)}
            className="border border-line rounded-md px-3 py-2 bg-surface" aria-label="Month" />
          {month && <a href={`/api/attendance/month?month=${month}&format=xlsx`} download
            className="grad-brand text-white font-medium rounded-md px-3.5 py-1.5 inline-flex items-center gap-1.5"><Download size={15} />Excel</a>}
        </>} />
      {err && <p className="text-off mb-4" role="alert">{err}</p>}
      {data && (
        <Card>
          <Table head={['Name', 'Days worked', 'Working (total)', 'At desk', 'Away work', 'Idle', 'Breaks', 'Offline', 'Unproductive', 'Avg per day', '']}>
            {data.people.map(p => (
              <Fragment key={p.userId}>
                <tr>
                  <td className="font-medium">{p.name}</td>
                  <td className="tabular-nums">{p.daysWorked}</td>
                  <td className="tabular-nums">{hm(p.workMinutes)}</td>
                  <td className="tabular-nums">{hm(p.deskWorkMinutes)}</td>
                  <td className="tabular-nums text-cat-away">{hm(p.awayWorkMinutes)}</td>
                  <td className="tabular-nums">{hm(p.idleMinutes)}</td>
                  <td className="tabular-nums">{hm(p.breakMinutes)}</td>
                  <td className={`tabular-nums ${p.offlineMinutes ? 'text-amber-600' : ''}`}>{hm(p.offlineMinutes)}</td>
                  <td className={`tabular-nums ${p.unproductiveMinutes ? 'text-rose-500' : ''}`}>{hm(p.unproductiveMinutes)}</td>
                  <td className="tabular-nums">{p.daysWorked ? hm(p.avgWorkMinutes) : '–'}</td>
                  <td className="text-right">
                    {p.daysWorked > 0 && <Button variant="ghost" onClick={() => setOpen(open === p.userId ? null : p.userId)}>{open === p.userId ? 'Hide days' : 'Show days'}</Button>}
                  </td>
                </tr>
                {open === p.userId && data.rows.filter(r => r.userId === p.userId).map(r => (
                  <tr key={r.date} className="bg-surface-2 text-sm">
                    <td className="pl-8 text-fg-2">{new Date(`${r.date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                    <td className="text-fg-3 tabular-nums">{r.login || '–'} – {r.logout || '–'}</td>
                    <td className="tabular-nums">{hm(r.workMinutes)}</td>
                    <td className="tabular-nums">{hm(r.deskWorkMinutes)}</td>
                    <td className="tabular-nums text-cat-away" title={r.awayWork?.map(a => `${a.reason} ${hm(a.minutes)}`).join('\n')}>{hm(r.awayWorkMinutes)}</td>
                    <td className="tabular-nums">{hm(r.idleMinutes)}</td>
                    <td className="tabular-nums">{hm(r.breakMinutes)}</td>
                    <td className={`tabular-nums ${r.offlineMinutes ? 'text-amber-600' : ''}`}>{hm(r.offlineMinutes)}</td>
                    <td className={`tabular-nums ${r.unproductiveMinutes ? 'text-rose-500' : ''}`} title={unpTitle(r.unproductive)}>{hm(r.unproductiveMinutes)}</td>
                    <td>{r.checks ? <span className="inline-flex items-center gap-1 text-amber-600"><ShieldAlert size={13} />{r.checks} to review</span> : ''}</td>
                    <td />
                  </tr>
                ))}
              </Fragment>
            ))}
          </Table>
          {!data.rows.length && <p className="p-4 text-sm text-fg-3">No activity recorded in this month yet.</p>}
        </Card>
      )}
    </>
  )
}

// Unproductive sites/apps on this day (from the agent + browser extension). Shown, not taken off working hours.
const HOW = { active: 'in front', playing: 'video playing', visible: 'on screen' }
function Unproductive({ d }) {
  if (!d.unproductive?.length) return null
  return (
    <div className="mt-4 rounded-xl border border-line bg-red-50 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-sm font-medium text-fg">Unproductive sites and apps · {hm(d.unproductiveMinutes)}</div>
        <div className="text-xs text-fg-3">Shown for review; not taken off working time</div>
      </div>
      <ul className="mt-2 divide-y divide-line">
        {d.unproductive.map(u => (
          <li key={u.label} className="flex flex-wrap justify-between gap-2 py-1.5 text-sm">
            <span><span className="inline-block w-2.5 h-2.5 rounded-full mr-2 bg-off" />{u.label}
              <span className="ml-2 text-xs text-fg-3">{u.how.map(h => HOW[h] || h).join(', ')}</span></span>
            <span className="tabular-nums text-fg-2">{hm(u.minutes)}{u.duringWorkMinutes ? <span className="text-xs text-fg-3"> · {hm(u.duringWorkMinutes)} while counted as work</span> : ''}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Admin: the company list of unproductive / productive sites and apps.
function RulesView({ tabs }) {
  const [rules, setRules] = useState(null)
  const [f, setF] = useState({ kind: 'site', pattern: '', label: '', rating: 'unproductive' })
  const [err, setErr] = useState('')
  const load = () => api('/site-rules').then(d => setRules(d.rules)).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])
  const add = async e => {
    e.preventDefault(); setErr('')
    try { await api('/site-rules', { method: 'POST', body: f }); setF({ ...f, pattern: '', label: '' }); load() } catch (x) { setErr(x.message) }
  }
  const remove = async id => { try { await api(`/site-rules/${id}`, { method: 'DELETE' }); load() } catch (x) { setErr(x.message) } }
  const field = 'border border-line rounded-md px-3 py-2 bg-surface'
  return (
    <>
      <PageHeader title="Attendance" sub="Site rules: which websites and programs count as unproductive" actions={tabs} />
      <Card className="p-4 mb-4">
        <form onSubmit={add} className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-fg-2">Type<br />
            <select className={field} value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })}><option value="site">Website</option><option value="app">Program</option></select></label>
          <label className="text-xs text-fg-2">{f.kind === 'site' ? 'Website (e.g. youtube.com)' : 'Program name (e.g. steam)'}<br />
            <input className={field} required value={f.pattern} onChange={e => setF({ ...f, pattern: e.target.value })} placeholder={f.kind === 'site' ? 'youtube.com' : 'steam'} /></label>
          <label className="text-xs text-fg-2">Shown as<br />
            <input className={field} required value={f.label} onChange={e => setF({ ...f, label: e.target.value })} placeholder="YouTube" /></label>
          <label className="text-xs text-fg-2">Counts as<br />
            <select className={field} value={f.rating} onChange={e => setF({ ...f, rating: e.target.value })}><option value="unproductive">Unproductive</option><option value="productive">Productive</option></select></label>
          <Button variant="primary" type="submit">Add</Button>
        </form>
        {err && <p className="text-off text-sm mt-2" role="alert">{err}</p>}
        <p className="text-xs text-fg-3 mt-2">Only sites and programs on this list are ever recorded (name and minutes). Agents pick up changes within an hour.</p>
      </Card>
      {rules && (
        <Card>
          <Table head={['Shown as', 'Type', 'Website / program', 'Counts as', '']}>
            {rules.map(r => (
              <tr key={r.id}>
                <td className="font-medium">{r.label}</td>
                <td className="text-fg-3">{r.kind === 'site' ? 'Website' : 'Program'}</td>
                <td className="tabular-nums">{r.pattern}</td>
                <td><Pill tone={r.rating === 'unproductive' ? 'late' : 'ok'}>{r.rating === 'unproductive' ? 'Unproductive' : 'Productive'}</Pill></td>
                <td className="text-right"><Button variant="ghost" onClick={() => remove(r.id)}>Remove</Button></td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
      <OfficeNetworks />
    </>
  )
}

// Admin: what counts as "Office" for check-in / check-out (office internet address or Wi-Fi name).
function OfficeNetworks() {
  const [list, setList] = useState(null)
  const [f, setF] = useState({ kind: 'wifi', value: '', label: '' })
  const [err, setErr] = useState('')
  const load = () => api('/office-networks').then(d => setList(d.networks)).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])
  const add = async e => {
    e.preventDefault(); setErr('')
    try { await api('/office-networks', { method: 'POST', body: f }); setF({ ...f, value: '' }); load() } catch (x) { setErr(x.message) }
  }
  const remove = async id => { try { await api(`/office-networks/${id}`, { method: 'DELETE' }); load() } catch (x) { setErr(x.message) } }
  const field = 'border border-line rounded-md px-3 py-2 bg-surface'
  return (
    <Card className="p-4 mt-4">
      <h2 className="font-semibold text-fg">Office networks</h2>
      <p className="text-xs text-fg-3 mb-3">Check-in and check-out show <b>Office</b> when the computer is on one of these, otherwise <b>Remote</b>. Leave empty to show only the Wi-Fi name and place.</p>
      <form onSubmit={add} className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-fg-2">Type<br />
          <select className={field} value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })}><option value="wifi">Wi-Fi name</option><option value="ip">Internet address</option></select></label>
        <label className="text-xs text-fg-2">{f.kind === 'wifi' ? 'Wi-Fi name (e.g. ImagiNET Hub 2)' : 'Office internet address'}<br />
          <input className={field} required value={f.value} onChange={e => setF({ ...f, value: e.target.value })} /></label>
        <label className="text-xs text-fg-2">Office<br />
          <input className={field} required value={f.label} onChange={e => setF({ ...f, label: e.target.value })} placeholder="Chennai office" /></label>
        <Button variant="primary" type="submit">Add</Button>
      </form>
      {err && <p className="text-off text-sm mt-2" role="alert">{err}</p>}
      {list?.length > 0 && (
        <ul className="mt-3 divide-y divide-line">
          {list.map(n => (
            <li key={n.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
              <span><b>{n.label}</b> <span className="text-fg-3">· {n.kind === 'wifi' ? 'Wi-Fi' : 'Internet address'} {n.value}</span></span>
              <Button variant="ghost" onClick={() => remove(n.id)}>Remove</Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

// Live status → status token + label (DESIGN.md §6).
const LIVE = { working: ['ok', 'Working'], idle: ['idle', 'Idle'], on_break: ['brk', 'On break'], offline: ['off', 'Offline'] }

// One person in the team list: who, in → out, progress to 9 h, and anything to check.
function TeamRow({ p, isToday, active, onOpen }) {
  const target = p.officeDayMinutes || 540
  const st = !p.hasAgent ? ['none', 'No agent yet'] : !p.firstIn ? ['none', 'Not started'] : isToday && p.status ? LIVE[p.status] : ['ok', 'Worked']
  return (
    <li>
      <button type="button" onClick={onOpen}
        className={`w-full text-left px-5 py-3.5 grid gap-x-6 gap-y-2 items-center sm:grid-cols-[2.2fr_1.6fr_2.4fr_1fr] hover:bg-surface-2 transition duration-150 ${active ? 'bg-surface-2' : ''}`}>
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={p.name} size={34} />
          <div className="min-w-0">
            <div className="font-medium text-fg truncate">{p.name}</div>
            <div className="flex items-center gap-1.5 text-xs text-fg-3"><StatusDot tone={st[0]} live={isToday && p.status === 'working'} />{st[1]}</div>
          </div>
        </div>
        <div className="min-w-0">
          <div className="font-mono font-light text-[13px] text-fg whitespace-nowrap">{p.firstIn ? <>{time(p.firstIn)} → {isToday && p.stillWorking ? 'now' : time(p.lastOut)}</> : 'Not started'}</div>
          {p.location?.in?.place && <div className="text-xs text-fg-3 truncate">{p.location.in.label || p.location.in.place}</div>}
        </div>
        <div className="min-w-0">
          {p.firstIn ? <>
            <div className="flex items-baseline justify-between gap-2"><span className="font-mono text-[13px] text-fg">{hm(p.workMinutes)}</span><span className="text-[11px] text-fg-3">of {Math.round(target / 60)}h</span></div>
            <div className="mt-1.5 h-[5px] rounded-full bg-surface-2 overflow-hidden flex" title={`At desk ${hm(p.deskWorkMinutes)} · Away work ${hm(p.awayWorkMinutes)}`}>
              <i className="block h-full bg-ok" style={{ width: `${Math.min(100, p.deskWorkMinutes / target * 100)}%` }} />
              <i className="block h-full bg-away" style={{ width: `${Math.min(100, p.awayWorkMinutes / target * 100)}%` }} />
            </div>
          </> : !p.hasAgent ? <span className="text-xs font-medium text-violet">Install agent →</span> : <span className="text-fg-3">–</span>}
        </div>
        <div className="flex flex-wrap gap-1.5 sm:justify-end">
          {p.unproductiveMinutes > 0 && <Chip tone="bad" title={unpTitle(p.unproductive)}>Unproductive {hm(p.unproductiveMinutes)}</Chip>}
          {p.flags?.length > 0 && <Chip tone="warn" title={p.flags.map(f => f.text).join('\n')}>{p.flags.length} to review</Chip>}
        </div>
      </button>
    </li>
  )
}

// One person's day: ring, in → out, one legend, timeline, time away, devices.
function DayDetail({ data, lead, isToday }) {
  const d = data.day
  const [showDev, setShowDev] = useState(false)
  const newest = data.devices.map(v => v.version).filter(Boolean).sort().pop()
  const old = data.devices.filter(v => v.version && v.version !== newest).length
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center gap-6 my-5">
        <DayRing d={d} />
        <div className="min-w-0 space-y-3">
          <div className="font-display font-light text-[28px] text-fg">{time(d.firstIn)} → {isToday && d.stillWorking ? 'now' : time(d.lastOut)}</div>
          {d.location?.in && (
            <Chip title={placeLine(d.location.in)}>
              <MapPin size={12} strokeWidth={1.5} />{d.location.in.place ? (d.location.in.label ? `${d.location.in.place} · ${d.location.in.label}` : d.location.in.place) : (d.location.in.wifi ? `Wi-Fi ${d.location.in.wifi}` : 'Location unknown')}
              {d.location.in.lat !== undefined && <MapLink p={d.location.in} />}
            </Chip>
          )}
          <TimeSplit d={d} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {d.claudeMinutes > 0 && <Chip title="Claude Code was working; counted as work"><Sparkles size={12} strokeWidth={1.5} />Claude {hm(d.claudeMinutes)}</Chip>}
        {d.extension && <Chip tone={d.extension === 'on' ? 'neutral' : 'warn'}><Puzzle size={12} strokeWidth={1.5} />{EXT[d.extension][1]}</Chip>}
        {lead && d.flags?.length > 0 && (
          <details className="group basis-full">
            <summary className="list-none cursor-pointer w-fit"><Chip tone="warn"><ShieldAlert size={12} strokeWidth={1.5} />{d.flags.length === 1 ? '1 thing to look at' : `${d.flags.length} things to look at`}</Chip></summary>
            <ul className="mt-2 text-sm text-fg-2 space-y-1">{d.flags.map(f => <li key={f.code}>• {f.text}</li>)}</ul>
            <p className="text-xs text-fg-3 mt-1">Hints from the activity pattern, not proof. Ask the person if unsure.</p>
          </details>
        )}
      </div>
      <div className="mt-7"><DayBar pieces={d.pieces} lastSeen={isToday ? d.lastOut : null} /></div>
      <Unproductive d={d} />
      {d.pieces.some(away) && (
        <Card className="mt-5 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-line text-sm font-medium text-fg">Time away from the desk ({d.pieces.filter(away).length})</div>
          <ul className="divide-y divide-line">
            {d.pieces.filter(away).map((p, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-3 px-5 py-3 text-sm">
                <span className="flex items-center gap-2 text-fg"><StatusDot tone={KIND[p.kind].tone} />{p.reason || KIND[p.kind].label}
                  {p.kind === 'away_work' && <Chip className="!py-0.5">counted as work</Chip>}</span>
                <span className="font-mono font-light text-[13px] text-fg-2">{time(p.start)} – {time(p.end)} · {hm(Math.round((Date.parse(p.end) - Date.parse(p.start)) / 60000))}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {!data.devices.length
        ? <p className="mt-5 text-sm text-amber-700 bg-amber-50 rounded-md px-3 py-2">No computer is signed in to the desktop agent for {data.person.name} yet, so nothing is recorded.</p>
        : <div className="mt-5 pt-3.5 border-t border-line text-xs text-fg-2">
            {data.devices.length} {data.devices.length === 1 ? 'device' : 'devices'}
            {old > 0 && <> · <span className="text-amber-700 font-medium">{old} outdated</span></>}
            {' · '}<button type="button" className="text-violet hover:underline" onClick={() => setShowDev(s => !s)}>{showDev ? 'Hide' : 'Details'}</button>
            {showDev && <div className="mt-2 leading-7 text-fg-3">{data.devices.map((v, i) => (
              <div key={`${v.name}-${i}`} className="flex items-center gap-1.5"><Monitor size={12} strokeWidth={1.5} />{v.name}{v.version ? ` · agent ${v.version}` : ''} · last seen {v.lastSeen ? new Date(v.lastSeen.replace(' ', 'T') + 'Z').toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'never'}</div>
            ))}</div>}
          </div>}
    </>
  )
}

// ‹ Fri, 27 Nov 2026 › Today — the date itself opens the calendar to pick any day.
function DateStepper({ date, today, onChange }) {
  const shift = n => { const t = new Date(`${date}T00:00:00`); t.setDate(t.getDate() + n); const v = t.toLocaleDateString('en-CA'); if (v <= today) onChange(v) }
  const label = date && new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const btn = 'px-3 py-1.5 rounded-md text-sm text-fg-2 hover:bg-violet-tint transition duration-150 disabled:opacity-40 disabled:hover:bg-transparent'
  return (
    <div className="flex items-center gap-1 bg-surface border border-line rounded-md p-1 shadow-card">
      <button type="button" className={btn} onClick={() => shift(-1)} aria-label="Previous day">‹</button>
      <label className="relative px-2 min-w-[140px] text-center font-medium text-fg cursor-pointer">{label}
        <input type="date" value={date} max={today} onChange={e => e.target.value && onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" aria-label="Pick a day" />
      </label>
      <button type="button" className={btn} onClick={() => shift(1)} disabled={date >= today} aria-label="Next day">›</button>
      <button type="button" className={`${btn} !text-violet`} onClick={() => onChange(today)} disabled={date === today}>Today</button>
    </div>
  )
}

// Five numbers on top of the team list.
function Kpis({ people, isToday }) {
  const started = people.filter(p => p.firstIn)
  const n = s => started.filter(p => p.status === s).length
  const avg = started.length ? Math.round(started.reduce((s, p) => s + p.workMinutes, 0) / started.length) : null
  const list = isToday
    ? [['Present', n('working'), 'ok'], ['Away', n('on_break') + n('idle'), 'away'], ['Not started', people.length - started.length, 'none'], ['Offline', n('offline'), 'off'], ['Avg. hours', hm(avg)]]
    : [['Worked', started.length, 'ok'], ['Did not work', people.length - started.length, 'none'], ['Avg. hours', hm(avg)]]
  return (
    <div className={`grid grid-cols-2 gap-3 mb-5 ${isToday ? 'md:grid-cols-5' : 'md:grid-cols-3'}`}>
      {list.map(([l, v, dot]) => <KpiCard key={l} label={l} value={v} dot={dot} />)}
    </div>
  )
}

function DayView({ tabs }) {
  const { user } = useAuth()
  const lead = user.role === 'admin' || user.role === 'tl'
  const [date, setDate] = useState('')
  const [who, setWho] = useState(user.id)
  const [data, setData] = useState(null)
  const [team, setTeam] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setBusy(true); setErr('')
    try {
      const q = `?userId=${who}${date ? `&date=${date}` : ''}`
      const [d, t] = await Promise.all([api(`/attendance/day${q}`), lead ? api(`/attendance/team${date ? `?date=${date}` : ''}`) : null])
      setData(d); setTeam(t)
      if (!date) setDate(d.today)
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  useEffect(() => { load() }, [date, who]) // eslint-disable-line react-hooks/exhaustive-deps
  // Today's view refreshes itself every minute.
  useEffect(() => {
    if (!data || data.date !== data.today) return
    const t = setInterval(load, 60 * 1000)
    return () => clearInterval(t)
  }, [data?.date, data?.today, who]) // eslint-disable-line react-hooks/exhaustive-deps

  const d = data?.day
  const isToday = data && data.date === data.today
  const mine = data && data.person?.id === user.id
  const untracked = data && data.tracked === false // admin: no day of their own, only the team
  const dayLabel = data && new Date(`${data.date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
  const closeDrawer = () => setWho(user.id)
  const drawerOpen = !!(data?.person && who !== user.id && data.person.id === who)
  const liveChip = isToday && d && <Chip><StatusDot tone={LIVE[d.status][0]} live={d.status === 'working'} />{LIVE[d.status][1]}</Chip>

  return (
    <>
      <PageHeader title="Attendance"
        sub="Login, logout and breaks, recorded by the desktop agent on each computer."
        actions={<>
          {tabs}
          {data && <DateStepper date={date} today={data.today} onChange={setDate} />}
          <Button variant="ghost" onClick={load} disabled={busy} title="Refresh" aria-label="Refresh"><RefreshCw size={16} strokeWidth={1.5} className={busy ? 'animate-spin' : ''} /></Button>
        </>} />

      {err && <p className="text-off mb-4" role="alert">{err}</p>}

      {!data && !err && (
        <div className="space-y-3" aria-label="Loading">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{[0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[84px] rounded-lg" />)}</div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      )}

      {data && (
        <>
          {team && <Kpis people={team.people} isToday={isToday} />}

          {/* Your own day (tracked roles) stays on the page. */}
          {!untracked && mine && (
            <Card className="p-6 mb-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[26px] leading-tight">My day</h2>
                  <p className="text-xs text-fg-3">{dayLabel}{isToday && d.stillWorking && ' · still working'}</p>
                </div>
                {liveChip}
              </div>
              <DayDetail data={data} lead={lead} isToday={isToday} />
            </Card>
          )}

          {team && (
            <Card className="overflow-hidden">
              <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-line">
                <h3 className="text-sm font-medium text-fg">{isToday ? 'Team now' : 'Team on this day'}</h3>
                <span className="text-xs text-fg-3">Click a person to open their day</span>
              </div>
              {team.people.length
                ? <ul className="divide-y divide-line">
                    {team.people.map(p => <TeamRow key={p.id} p={p} isToday={isToday} active={p.id === who && !mine} onOpen={() => setWho(p.id)} />)}
                  </ul>
                : <EmptyState text="No one is set up for attendance yet." />}
            </Card>
          )}

          {/* Someone else's day: right-hand drawer. */}
          <Drawer open={drawerOpen} onClose={closeDrawer} title={data.person?.name} sub={dayLabel} aside={liveChip}>
            {drawerOpen && <DayDetail data={data} lead={lead} isToday={isToday} />}
          </Drawer>
        </>
      )}
    </>
  )
}
