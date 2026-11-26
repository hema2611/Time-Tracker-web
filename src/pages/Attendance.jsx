import { Fragment, useEffect, useState } from 'react'
import { RefreshCw, Monitor, Download, ShieldAlert } from 'lucide-react'
import { api } from '../lib/api.js'
import { useAuth } from '../auth.jsx'
import { Card, Pill, PageHeader, Table, Kpi, Button } from '../components/ui.jsx'

// Hours and breaks come from the desktop agent on each person's computer.
const KIND = {
  // Five clearly different colours: at desk, away work, idle, break, offline.
  work: { bar: 'bg-[#8b5cf6]', label: 'At desk' },
  away_work: { bar: 'bg-[#2dd4bf]', label: 'Away work (meeting, call…)' },
  idle: { bar: 'bg-[#94a3b8]', label: 'Idle' },
  break: { bar: 'bg-[#fbbf24]', label: 'Break' },
  offline: { bar: 'bg-[#b91c1c]', label: 'Offline' },
}
const STATUS = { working: ['ok', 'Working'], idle: ['neutral', 'Idle'], on_break: ['risk', 'On break'], offline: ['neutral', 'Offline'] }

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

// One day as a bar: work / break / offline pieces on a time line.
function DayBar({ pieces }) {
  if (!pieces.length) return <div className="h-10 rounded-xl bg-slate-100 grid place-items-center text-xs text-slate-500">No activity recorded</div>
  const H = 3600 * 1000
  const first = Date.parse(pieces[0].start), last = Date.parse(pieces[pieces.length - 1].end)
  // Show whole hours around the day, at least 9 hours wide.
  let from = Math.floor(first / H) * H, to = Math.ceil(last / H) * H
  if (to - from < 9 * H) to = from + 9 * H
  const pct = t => ((t - from) / (to - from)) * 100
  const hours = []
  for (let t = from; t <= to; t += H) hours.push(t)
  const step = hours.length > 14 ? 2 : 1
  return (
    <div>
      <div className="relative h-10 rounded-xl bg-slate-100 overflow-hidden">
        {pieces.map((p, i) => (
          <div key={i} className={`absolute top-0 bottom-0 ${KIND[p.kind].bar}`}
            style={{ left: `${pct(Date.parse(p.start))}%`, width: `${Math.max(pct(Date.parse(p.end)) - pct(Date.parse(p.start)), 0.3)}%` }}
            title={`${KIND[p.kind].label}${p.reason ? ` (${p.reason})` : ''}: ${time(p.start)} – ${time(p.end)}`} />
        ))}
      </div>
      <div className="relative h-5 mt-1 text-[11px] text-slate-500">
        {hours.map((t, i) => i % step === 0 && (
          <span key={t} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${pct(t)}%` }}>
            {new Date(t).toLocaleTimeString([], { hour: 'numeric' })}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-2">
        {Object.values(KIND).map(k => <span key={k.label} className="flex items-center gap-1.5"><span className={`w-3 h-3 rounded ${k.bar}`} />{k.label}</span>)}
      </div>
    </div>
  )
}

// Day / Month switch shown in the page header of both views.
function Tabs({ tab, setTab, admin }) {
  return (
    <div className="flex rounded-xl border border-slate-200 p-0.5" role="tablist">
      {[['day', 'Day'], ['month', 'Month'], ...(admin ? [['rules', 'Site rules']] : [])].map(([k, l]) => (
        <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
          className={`px-3 py-1 rounded-lg text-sm ${tab === k ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-500'}`}>{l}</button>
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
            className="border border-slate-200 rounded-xl px-3 py-1.5 bg-white" aria-label="Month" />
          {month && <a href={`/api/attendance/month?month=${month}&format=xlsx`} download
            className="rail text-ink font-medium rounded-xl px-3.5 py-1.5 inline-flex items-center gap-1.5"><Download size={15} />Excel</a>}
        </>} />
      {err && <p className="text-red-600 mb-4" role="alert">{err}</p>}
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
                  <td className="tabular-nums text-[#2dd4bf]">{hm(p.awayWorkMinutes)}</td>
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
                  <tr key={r.date} className="bg-slate-100/40 text-sm">
                    <td className="pl-8 text-slate-600">{new Date(`${r.date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                    <td className="text-slate-500 tabular-nums">{r.login || '–'} – {r.logout || '–'}</td>
                    <td className="tabular-nums">{hm(r.workMinutes)}</td>
                    <td className="tabular-nums">{hm(r.deskWorkMinutes)}</td>
                    <td className="tabular-nums text-[#2dd4bf]" title={r.awayWork?.map(a => `${a.reason} ${hm(a.minutes)}`).join('\n')}>{hm(r.awayWorkMinutes)}</td>
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
          {!data.rows.length && <p className="p-4 text-sm text-slate-500">No activity recorded in this month yet.</p>}
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
    <div className="mt-4 rounded-xl border border-rose-300/30 bg-rose-50/40 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-sm font-medium text-slate-900">Unproductive sites and apps · {hm(d.unproductiveMinutes)}</div>
        <div className="text-xs text-slate-500">Shown for review; not taken off working time</div>
      </div>
      <ul className="mt-2 divide-y divide-slate-100">
        {d.unproductive.map(u => (
          <li key={u.label} className="flex flex-wrap justify-between gap-2 py-1.5 text-sm">
            <span><span className="inline-block w-2.5 h-2.5 rounded-full mr-2 bg-rose-500" />{u.label}
              <span className="ml-2 text-xs text-slate-500">{u.how.map(h => HOW[h] || h).join(', ')}</span></span>
            <span className="tabular-nums text-slate-600">{hm(u.minutes)}{u.duringWorkMinutes ? <span className="text-xs text-slate-500"> · {hm(u.duringWorkMinutes)} while counted as work</span> : ''}</span>
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
  const field = 'border border-slate-200 rounded-xl px-3 py-1.5 bg-white'
  return (
    <>
      <PageHeader title="Attendance" sub="Site rules: which websites and programs count as unproductive" actions={tabs} />
      <Card className="p-4 mb-4">
        <form onSubmit={add} className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-slate-600">Type<br />
            <select className={field} value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })}><option value="site">Website</option><option value="app">Program</option></select></label>
          <label className="text-xs text-slate-600">{f.kind === 'site' ? 'Website (e.g. youtube.com)' : 'Program name (e.g. steam)'}<br />
            <input className={field} required value={f.pattern} onChange={e => setF({ ...f, pattern: e.target.value })} placeholder={f.kind === 'site' ? 'youtube.com' : 'steam'} /></label>
          <label className="text-xs text-slate-600">Shown as<br />
            <input className={field} required value={f.label} onChange={e => setF({ ...f, label: e.target.value })} placeholder="YouTube" /></label>
          <label className="text-xs text-slate-600">Counts as<br />
            <select className={field} value={f.rating} onChange={e => setF({ ...f, rating: e.target.value })}><option value="unproductive">Unproductive</option><option value="productive">Productive</option></select></label>
          <Button variant="primary" type="submit">Add</Button>
        </form>
        {err && <p className="text-red-600 text-sm mt-2" role="alert">{err}</p>}
        <p className="text-xs text-slate-500 mt-2">Only sites and programs on this list are ever recorded (name and minutes). Agents pick up changes within an hour.</p>
      </Card>
      {rules && (
        <Card>
          <Table head={['Shown as', 'Type', 'Website / program', 'Counts as', '']}>
            {rules.map(r => (
              <tr key={r.id}>
                <td className="font-medium">{r.label}</td>
                <td className="text-slate-500">{r.kind === 'site' ? 'Website' : 'Program'}</td>
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
  const field = 'border border-slate-200 rounded-xl px-3 py-1.5 bg-white'
  return (
    <Card className="p-4 mt-4">
      <h2 className="font-semibold text-slate-900">Office networks</h2>
      <p className="text-xs text-slate-500 mb-3">Check-in and check-out show <b>Office</b> when the computer is on one of these, otherwise <b>Remote</b>. Leave empty to show only the Wi-Fi name and place.</p>
      <form onSubmit={add} className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-slate-600">Type<br />
          <select className={field} value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })}><option value="wifi">Wi-Fi name</option><option value="ip">Internet address</option></select></label>
        <label className="text-xs text-slate-600">{f.kind === 'wifi' ? 'Wi-Fi name (e.g. ImagiNET Hub 2)' : 'Office internet address'}<br />
          <input className={field} required value={f.value} onChange={e => setF({ ...f, value: e.target.value })} /></label>
        <label className="text-xs text-slate-600">Office<br />
          <input className={field} required value={f.label} onChange={e => setF({ ...f, label: e.target.value })} placeholder="Chennai office" /></label>
        <Button variant="primary" type="submit">Add</Button>
      </form>
      {err && <p className="text-red-600 text-sm mt-2" role="alert">{err}</p>}
      {list?.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100">
          {list.map(n => (
            <li key={n.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
              <span><b>{n.label}</b> <span className="text-slate-500">· {n.kind === 'wifi' ? 'Wi-Fi' : 'Internet address'} {n.value}</span></span>
              <Button variant="ghost" onClick={() => remove(n.id)}>Remove</Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
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
  const mine = data && data.person.id === user.id

  return (
    <>
      <PageHeader title="Attendance"
        sub="Login, logout and breaks, recorded by the desktop agent on each computer."
        actions={<>
          {tabs}
          <input type="date" value={date} max={data?.today} onChange={e => setDate(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-1.5 bg-white" aria-label="Day" />
          <Button onClick={load} disabled={busy} title="Refresh"><RefreshCw size={15} className={busy ? 'animate-spin' : ''} /></Button>
        </>} />

      {err && <p className="text-red-600 mb-4" role="alert">{err}</p>}

      {data && (
        <>
          <Card className="p-5 mb-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-semibold text-slate-900">{mine ? 'My day' : data.person.name}</h2>
                <p className="text-xs text-slate-500">
                  {new Date(`${data.date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                  {isToday && d.stillWorking && ' · still working'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isToday && <Pill tone={STATUS[d.status][0]}>{STATUS[d.status][1]}</Pill>}
                {!mine && <Button variant="ghost" onClick={() => setWho(user.id)}>Back to my day</Button>}
              </div>
            </div>

            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 mb-5">
              <Kpi label="Login" value={time(d.firstIn)} note={<Place p={d.location?.in} />} />
              <Kpi label="Logout" value={isToday && d.stillWorking ? 'Now' : time(d.lastOut)} note={<Place p={d.location?.out} />} />
              <Kpi label="Working time (total)" value={hm(d.workMinutes)} note={`At desk ${hm(d.deskWorkMinutes)}`} />
              <Kpi label="Away work" value={hm(d.awayWorkMinutes)}
                note={d.awayWork?.length ? d.awayWork.map(a => `${a.reason} ${hm(a.minutes)}`).join(' · ') : 'Meetings, calls, work away'} />
              <Kpi label="Idle" value={hm(d.idleMinutes)} tone={d.idleMinutes > 60 ? 'warn' : undefined} note="PC on, no activity" />
              <Kpi label="Breaks" value={hm(d.breakMinutes)} tone={d.breakMinutes > 90 ? 'warn' : undefined} note={d.breakMinutes > 90 ? 'Over 1h 30m' : undefined} />
              <Kpi label="Offline / agent off" value={hm(d.offlineMinutes)} tone={d.offlineMinutes ? 'warn' : undefined} />
            </div>

            {lead && d.flags?.length > 0 && (
              <div className="mb-4 rounded-xl border border-amber-300/40 bg-amber-50 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-800"><ShieldAlert size={16} />Worth a closer look</div>
                <ul className="mt-1 list-disc pl-6 text-sm text-amber-800">{d.flags.map(f => <li key={f.code}>{f.text}</li>)}</ul>
                <p className="mt-1 text-xs text-amber-700">These are hints from the activity pattern, not proof.</p>
              </div>
            )}

            <DayBar pieces={d.pieces} />
            <Unproductive d={d} />

            {d.pieces.some(away) && (
              <details className="mt-4" open>
                <summary className="cursor-pointer text-sm text-slate-600">Time away from the desk ({d.pieces.filter(away).length})</summary>
                <ul className="mt-2 divide-y divide-slate-100">
                  {d.pieces.filter(away).map((p, i) => (
                    <li key={i} className="flex justify-between gap-3 py-2 text-sm">
                      <span>
                        <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${KIND[p.kind].bar}`} />{p.reason || KIND[p.kind].label}
                        {p.kind === 'away_work' && <span className="ml-2 text-xs text-[#2dd4bf]">away work, counted as work</span>}
                      </span>
                      <span className="text-slate-500 tabular-nums">{time(p.start)} – {time(p.end)} · {hm(Math.round((Date.parse(p.end) - Date.parse(p.start)) / 60000))}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {!data.devices.length && (
              <p className="mt-4 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                No computer is signed in to the desktop agent for {mine ? 'you' : data.person.name} yet, so nothing is recorded.
              </p>
            )}
            {data.devices.length > 0 && (
              <p className="mt-4 text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                {data.devices.map(v => <span key={v.name} className="flex items-center gap-1"><Monitor size={13} />{v.name} · last seen {v.lastSeen ? new Date(v.lastSeen.replace(' ', 'T') + 'Z').toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'never'}</span>)}
              </p>
            )}
          </Card>

          {team && (
            <Card>
              <div className="px-4 pt-4 pb-2">
                <h2 className="font-semibold text-slate-900">{isToday ? 'Team now' : 'Team on this day'}</h2>
                <p className="text-xs text-slate-500">Click a name to see their day.</p>
              </div>
              <Table head={['Name', ...(isToday ? ['Now'] : []), 'Login', 'Logout', 'Working (total)', 'At desk', 'Away work', 'Idle', 'Breaks', 'Offline', 'Unproductive', 'Location', 'Checks']}>
                {team.people.map(p => (
                  <tr key={p.id} className={p.id === who ? 'bg-slate-100/60' : ''}>
                    <td>
                      <button className="font-medium text-left hover:underline" onClick={() => { setWho(p.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>{p.name}</button>
                      {!p.hasAgent && <div className="text-[11px] text-amber-600">No agent</div>}
                    </td>
                    {isToday && <td>{p.hasAgent ? <Pill tone={STATUS[p.status][0]}>{STATUS[p.status][1]}</Pill> : '–'}</td>}
                    <td className="tabular-nums">{time(p.firstIn)}</td>
                    <td className="tabular-nums">{isToday && p.stillWorking ? 'Now' : time(p.lastOut)}</td>
                    <td className="tabular-nums">{p.firstIn ? hm(p.workMinutes) : '–'}</td>
                    <td className="tabular-nums">{p.firstIn ? hm(p.deskWorkMinutes) : '–'}</td>
                    <td className="tabular-nums text-[#2dd4bf]" title={p.awayWork?.map(a => `${a.reason} ${hm(a.minutes)}`).join('\n')}>{p.firstIn ? hm(p.awayWorkMinutes) : '–'}</td>
                    <td className="tabular-nums">{p.firstIn ? hm(p.idleMinutes) : '–'}</td>
                    <td className="tabular-nums">{p.firstIn ? hm(p.breakMinutes) : '–'}</td>
                    <td className={`tabular-nums ${p.offlineMinutes ? 'text-amber-600' : ''}`}>{p.firstIn ? hm(p.offlineMinutes) : '–'}</td>
                    <td className={`tabular-nums ${p.unproductiveMinutes ? 'text-rose-500' : ''}`} title={unpTitle(p.unproductive)}>{p.firstIn ? hm(p.unproductiveMinutes) : '–'}</td>
                    <td className="text-xs text-slate-500">{p.location?.in ? <Place p={p.location.in} /> : '–'}</td>
                    <td title={p.flags?.map(f => f.text).join('\n')}>
                      {p.flags?.length ? <span className="inline-flex items-center gap-1 text-amber-600 text-sm"><ShieldAlert size={14} />{p.flags.length}</span> : <span className="text-slate-400">–</span>}
                    </td>
                  </tr>
                ))}
              </Table>
            </Card>
          )}
        </>
      )}
    </>
  )
}
