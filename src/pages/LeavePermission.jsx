import { useEffect, useRef, useState } from 'react'
import { CalendarPlus, Clock, X, Check, ChevronLeft, ChevronRight, CalendarOff, Hourglass, CircleCheck, CircleAlert, Ban } from 'lucide-react'
import { api, fmtDate } from '../lib/api.js'
import { useAuth } from '../auth.jsx'
import { toast } from '../lib/toast.js'
import { Card, Pill, Button, PageHeader, Input, Textarea, Table, Modal, ConfirmDialog, Dropdown, DatePicker, TimeSelect, Avatar, fmtTime } from '../components/ui.jsx'

const STATUS = {
  pending: { label: 'Pending', tone: 'risk', icon: Hourglass },
  approved: { label: 'Approved', tone: 'ok', icon: CircleCheck },
  rejected: { label: 'Declined', tone: 'late', icon: CircleAlert },
  cancelled: { label: 'Cancelled', tone: 'neutral', icon: Ban },
}
const pad = n => String(n).padStart(2, '0')
const fmtMinutes = m => { const h = Math.floor(m / 60), r = m % 60; return h && r ? `${h} h ${r} m` : h ? `${h} h` : `${r} m` }
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
// Today and the current time on this computer (the server checks again in office time).
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }

export default function LeavePermission() {
  const { user } = useAuth()
  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(thisYear)
  const [scope, setScope] = useState('mine')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [perms, setPerms] = useState({ view: true, create: false, edit: false })
  const [summary, setSummary] = useState(null)
  const [rows, setRows] = useState([])
  const [teamPending, setTeamPending] = useState(0)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(null) // 'leave' | 'permission'
  const [confirming, setConfirming] = useState(null)
  const [deciding, setDeciding] = useState(null)

  useEffect(() => { api('/permissions/me').then(p => setPerms(p.modules?.leave || {})).catch(() => {}) }, [])

  const loadSummary = () => api(`/leaves/summary?year=${year}`).then(setSummary).catch(e => toast.error(e.message))
  const loadRows = () => {
    setLoading(true)
    const q = new URLSearchParams({ scope, year, ...(type && { type }), ...(status && { status }) })
    return api(`/leaves?${q}`).then(d => setRows(d.requests)).catch(e => toast.error(e.message)).finally(() => setLoading(false))
  }
  const loadTeamPending = () => perms.edit && api(`/leaves?scope=team&status=pending&year=${year}`).then(d => setTeamPending(d.requests.length)).catch(() => {})
  const reload = () => { loadSummary(); loadRows(); loadTeamPending() }

  useEffect(() => { loadSummary() }, [year])
  useEffect(() => { loadRows() }, [scope, year, type, status])
  useEffect(() => { loadTeamPending() }, [perms.edit, year])

  const cancel = x => setConfirming({
    title: `Cancel this ${x.type}?`,
    message: `“${x.subject}” will be withdrawn.${x.type === 'leave' ? ` ${plural(x.days, 'day')} will go back to your balance.` : ''}`,
    confirmLabel: 'Yes, cancel it',
    onConfirm: async () => {
      try { await api(`/leaves/${x.id}/cancel`, { method: 'POST' }); toast.success(x.type === 'leave' ? `Leave cancelled. ${plural(x.days, 'day')} returned to your balance.` : 'Permission cancelled.'); reload() }
      catch (e) { toast.error(e.message) }
    },
  })

  const team = scope === 'team'
  const used = summary ? summary.used : 0
  const quota = summary ? summary.quota : 15
  const pct = Math.min(100, Math.round((used / quota) * 100))
  const low = summary && summary.remaining <= 3

  return (
    <div>
      <PageHeader title="Leave & Permission" sub="Apply for a day off or a few hours away, and keep track of your balance."
        actions={perms.create && (<>
          <Button onClick={() => setApplying('permission')}><Clock size={16} className="inline -mt-0.5 mr-1.5" />Apply permission</Button>
          <Button variant="primary" onClick={() => setApplying('leave')}><CalendarPlus size={16} className="inline -mt-0.5 mr-1.5" />Apply leave</Button>
        </>)} />

      {/* Balance */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
        <Card className="p-4 sm:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-slate-500">Leave balance · {year}</div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className={`text-3xl font-semibold tabular-nums ${low ? 'text-amber-700' : 'text-slate-900'}`}>{summary ? summary.remaining : '–'}</span>
                <span className="text-slate-500">of {quota} days left</span>
              </div>
            </div>
            <span className={`w-10 h-10 rounded-xl grid place-items-center ${low ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-600'}`}><CalendarOff size={19} /></span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={quota} aria-valuenow={used} aria-label="Leave days used">
            <div className={`h-full rounded-full transition-all ${low ? 'bg-amber-600' : 'bg-indigo-600'}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {summary ? <>You have taken <b className="text-slate-700">{plural(used, 'day')}</b> this year{summary.pending ? <> ({summary.pending} still awaiting approval)</> : null}.</> : 'Loading…'}
          </p>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl grid place-items-center bg-green-100 text-green-700 shrink-0"><CircleCheck size={19} /></span>
          <div><div className="text-2xl font-semibold tabular-nums text-slate-900">{summary ? summary.approved : '–'}</div><div className="text-xs text-slate-500">Approved leave days</div></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl grid place-items-center bg-amber-100 text-amber-700 shrink-0"><Hourglass size={19} /></span>
          <div>
            <div className="text-2xl font-semibold tabular-nums text-slate-900">{summary ? summary.permissionsThisMonth : '–'}</div>
            <div className="text-xs text-slate-500">Permissions this month{summary?.permissionMinutesThisMonth ? ` · ${fmtMinutes(summary.permissionMinutesThisMonth)}` : ''}</div>
          </div>
        </Card>
      </div>

      {/* Scope tabs + filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {perms.edit && (
          <div className="inline-flex bg-surface border border-slate-200 rounded-xl p-1 shadow-sm">
            {[{ v: 'mine', label: 'My requests' }, { v: 'team', label: 'Team requests' }].map(t => (
              <button key={t.v} onClick={() => setScope(t.v)} aria-pressed={scope === t.v}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${scope === t.v ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
                {t.label}
                {t.v === 'team' && teamPending > 0 && <span className={`text-xs rounded-full px-1.5 ${scope === t.v ? 'bg-white/20' : 'bg-amber-100 text-amber-700'}`}>{teamPending}</span>}
              </button>
            ))}
          </div>
        )}
        <div className="inline-flex bg-surface border border-slate-200 rounded-xl p-1 shadow-sm">
          {[{ v: '', label: 'All' }, { v: 'leave', label: 'Leave' }, { v: 'permission', label: 'Permission' }].map(t => (
            <button key={t.v} onClick={() => setType(t.v)} aria-pressed={type === t.v}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${type === t.v ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>{t.label}</button>
          ))}
        </div>
        <Dropdown className="w-44" value={status} onChange={setStatus} placeholder="All statuses"
          options={[{ value: '', label: 'All statuses' }, ...Object.entries(STATUS).map(([v, s]) => ({ value: v, label: s.label }))]} />
        <div className="ml-auto inline-flex items-center gap-1 bg-surface border border-slate-200 rounded-xl p-1 shadow-sm">
          <button onClick={() => setYear(y => y - 1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Previous year"><ChevronLeft size={16} /></button>
          <span className="px-2 font-semibold text-slate-800 tabular-nums">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Next year"><ChevronRight size={16} /></button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? <div className="p-8 text-center text-slate-400">Loading…</div>
          : rows.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-slate-500">{team ? 'No team requests match these filters.' : 'No requests yet.'}</p>
              {!team && perms.create && <p className="text-sm text-slate-400 mt-1">Use <b>Apply leave</b> or <b>Apply permission</b> above.</p>}
            </div>
          ) : (
            <Table head={['Request', ...(team ? ['Employee'] : []), 'When', 'Duration', 'Balance after', 'Status', '']}>
              {rows.map(x => {
                const s = STATUS[x.status]
                const others = team && (!x.mine || user?.role === 'admin')
                const canDecide = others && x.status === 'pending'
                const canTeamCancel = others && ['pending', 'approved'].includes(x.status)
                return (
                  <tr key={x.id} className="hover:bg-slate-50 align-top">
                    <td className="max-w-[320px]">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 ${x.type === 'leave' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>{x.type}</span>
                        <span className="font-medium text-slate-800 truncate">{x.subject}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 line-clamp-2" title={x.reason}>{x.reason}</div>
                    </td>
                    {team && (
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar photo={x.photo} name={x.user_name} size={30} />
                          <div className="min-w-0"><div className="font-medium text-slate-800 truncate">{x.user_name}</div><div className="text-xs text-slate-500 truncate">{x.emp_no || x.user_email}</div></div>
                        </div>
                      </td>
                    )}
                    <td className="whitespace-nowrap text-slate-700">
                      {x.type === 'leave'
                        ? (x.from_date === x.to_date ? fmtDate(x.from_date) : <>{fmtDate(x.from_date)} <span className="text-slate-400">→</span> {fmtDate(x.to_date)}</>)
                        : <>{fmtDate(x.from_date)}<div className="text-xs text-slate-500">{fmtTime(x.start_time)} – {fmtTime(x.end_time)}</div></>}
                    </td>
                    <td className="whitespace-nowrap text-slate-700">{x.type === 'leave' ? plural(x.days, 'day') : fmtMinutes(x.minutes)}</td>
                    <td className="whitespace-nowrap">
                      {x.balance_after == null ? <span className="text-slate-400">—</span>
                        : <span className={`font-medium tabular-nums ${x.balance_after <= 3 ? 'text-amber-700' : 'text-slate-700'}`}>{x.balance_after} of {quota} left</span>}
                    </td>
                    <td>
                      <Pill tone={s.tone}><s.icon size={12} className="inline -mt-0.5 mr-1" />{s.label}</Pill>
                      {x.decided_by_name && x.status !== 'pending' && <div className="text-xs text-slate-500 mt-1" title={x.decision_note || undefined}>{s.label} by {x.decided_by_name}{x.decision_note ? ` · “${x.decision_note}”` : ''}</div>}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {canDecide && (<>
                        <button onClick={() => setDeciding({ x, status: 'approved' })} className="text-slate-400 hover:text-green-600 p-1.5" title="Approve"><Check size={17} /></button>
                        <button onClick={() => setDeciding({ x, status: 'rejected' })} className="text-slate-400 hover:text-red-600 p-1.5" title="Decline"><X size={17} /></button>
                      </>)}
                      {canTeamCancel && (
                        <button onClick={() => setDeciding({ x, status: 'cancelled' })} className="text-slate-400 hover:text-red-600 p-1.5" title="Cancel request"><Ban size={16} /></button>
                      )}
                      {!team && x.status === 'pending' && (
                        <button onClick={() => cancel(x)} className="text-slate-400 hover:text-red-600 p-1.5" title="Cancel request"><X size={17} /></button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </Table>
          )}
      </Card>

      {applying === 'leave' && <ApplyLeave summary={summary} onClose={() => setApplying(null)} onSaved={() => { setApplying(null); reload() }} />}
      {applying === 'permission' && <ApplyPermission onClose={() => setApplying(null)} onSaved={() => { setApplying(null); reload() }} />}
      {deciding && <DecisionDialog {...deciding} onClose={() => setDeciding(null)} onDone={() => { setDeciding(null); reload() }} />}
      {confirming && <ConfirmDialog {...confirming} tone="warn" onClose={() => setConfirming(null)} />}
    </div>
  )
}

/* ---------- Apply leave ---------- */

function ApplyLeave({ summary, onClose, onSaved }) {
  const [f, setF] = useState({ from_date: '', to_date: '', subject: '', reason: '' })
  const [errors, setErrors] = useState({})
  const [preview, setPreview] = useState(null) // { days, weekends, holidays, used, quota, remaining, remainingAfter } | { error }
  const [checking, setChecking] = useState(false)
  const [busy, setBusy] = useState(false)
  const seq = useRef(0)
  const set = (k, v) => { setF(s => ({ ...s, [k]: v })); setErrors(e => (e[k] ? { ...e, [k]: undefined } : e)) }
  const year = new Date().getFullYear()

  // Ask the server how many working days the range uses and what balance remains.
  useEffect(() => {
    if (!f.from_date || !f.to_date) { setPreview(null); return }
    const id = ++seq.current
    setChecking(true)
    const t = setTimeout(() => {
      api('/leaves/preview', { method: 'POST', body: { from_date: f.from_date, to_date: f.to_date } })
        .then(p => { if (id === seq.current) setPreview(p) })
        .catch(e => { if (id === seq.current) setPreview({ error: e.message }) })
        .finally(() => { if (id === seq.current) setChecking(false) })
    }, 200)
    return () => clearTimeout(t)
  }, [f.from_date, f.to_date])

  const over = preview && !preview.error && preview.remainingAfter < 0

  const submit = async e => {
    e.preventDefault()
    const errs = {}
    if (!f.from_date) errs.from_date = 'Pick the first day of leave.'
    else if (f.from_date < todayISO()) errs.from_date = 'Leave cannot start in the past. Pick today or later.'
    if (!f.to_date) errs.to_date = 'Pick the last day of leave.'
    else if (f.from_date && f.to_date < f.from_date) errs.to_date = 'Must be the same as or after the "from" date.'
    if (!f.subject.trim()) errs.subject = 'Subject is required.'
    if (!f.reason.trim()) errs.reason = 'Reason is required.'
    if (Object.keys(errs).length) { setErrors(errs); return }
    if (preview?.error || over) { toast.error(preview?.error || 'Not enough leave balance.'); return }
    setBusy(true)
    try {
      const out = await api('/leaves', { method: 'POST', body: { type: 'leave', ...f } })
      toast.success(`Leave applied for ${plural(out.days, 'day')}. ${out.remaining} of ${out.quota} days left this year.`)
      onSaved()
    } catch (x) { setBusy(false); toast.error(x.message) }
  }

  return (
    <Modal title="Apply leave" sub="Weekends and holidays inside the dates are not counted." onClose={onClose} size="max-w-xl">
      <form onSubmit={submit} noValidate className="flex flex-col max-h-[80vh]">
        <div className="p-5 space-y-4 overflow-y-auto">
          {summary && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm">
              <CalendarOff size={17} className="text-indigo-600 shrink-0" />
              <span className="text-slate-600">You have taken <b className="text-slate-800">{plural(summary.used, 'day')}</b> this year. <b className="text-slate-800">{summary.remaining} of {summary.quota}</b> left.</span>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <DatePicker label="From date" req value={f.from_date} error={errors.from_date} min={todayISO()} maxYear={year + 1}
              onChange={v => { set('from_date', v); if (!f.to_date || f.to_date < v) set('to_date', v) }} />
            <DatePicker label="To date" req value={f.to_date} error={errors.to_date} min={f.from_date || todayISO()} maxYear={year + 1}
              hint={f.from_date ? 'Same day as "from" for a one-day leave' : undefined} onChange={v => set('to_date', v)} />
          </div>

          {/* Live count + balance */}
          {(checking || preview) && (
            preview?.error ? (
              <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"><CircleAlert size={17} className="shrink-0 mt-0.5" />{preview.error}</div>
            ) : preview ? (
              <div className={`rounded-xl border px-3.5 py-3 text-sm ${over ? 'border-red-200 bg-red-50' : 'border-indigo-200 bg-indigo-50'}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className={`font-semibold ${over ? 'text-red-700' : 'text-indigo-700'}`}>{plural(preview.days, 'working day')}</span>
                  <span className="text-xs text-slate-500">
                    {[preview.weekends && plural(preview.weekends, 'weekend day'), ...preview.holidays.map(h => h.name)].filter(Boolean).join(', ') || 'No weekends or holidays in between'}
                    {(preview.weekends || preview.holidays.length) ? ' not counted' : ''}
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/70 overflow-hidden">
                  <div className={`h-full ${over ? 'bg-red-500' : 'bg-indigo-600'}`} style={{ width: `${Math.min(100, ((preview.used + preview.days) / preview.quota) * 100)}%` }} />
                </div>
                <p className={`mt-2 ${over ? 'text-red-700 font-medium' : 'text-slate-600'}`}>
                  {over
                    ? `Not enough balance: you have ${preview.remaining} of ${preview.quota} days left in ${preview.year}, and this leave needs ${preview.days}.`
                    : `After this leave you will have ${preview.remainingAfter} of ${preview.quota} days left in ${preview.year}.`}
                </p>
              </div>
            ) : <div className="text-sm text-slate-400 px-1">Counting working days…</div>
          )}

          <Input label="Subject" req value={f.subject} error={errors.subject} onChange={e => set('subject', e.target.value)} placeholder="e.g. Family function" maxLength={160} />
          <Textarea label="Reason" req value={f.reason} error={errors.reason} onChange={e => set('reason', e.target.value)} placeholder="A short note for your approver" maxLength={2000} />
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy || checking || over || !!preview?.error}>{busy ? 'Applying…' : 'Apply leave'}</Button>
        </div>
      </form>
    </Modal>
  )
}

/* ---------- Apply permission ---------- */

function ApplyPermission({ onClose, onSaved }) {
  const [f, setF] = useState({ date: '', start_time: '', end_time: '', subject: '', reason: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k, v) => { setF(s => ({ ...s, [k]: v })); setErrors(e => (e[k] ? { ...e, [k]: undefined } : e)) }
  const year = new Date().getFullYear()
  const minutes = f.start_time && f.end_time ? toMin(f.end_time) - toMin(f.start_time) : null
  const isToday = f.date === todayISO()
  // For today, nothing before the current time; for later dates, any time.
  const startMin = isToday ? nowHM() : undefined

  const pickDate = v => {
    set('date', v)
    // Moving the date to today makes an already-chosen earlier time invalid; clear it so it is picked again.
    if (v === todayISO() && f.start_time && f.start_time < nowHM()) { set('start_time', ''); set('end_time', '') }
  }

  const pickStart = v => {
    set('start_time', v)
    // Suggest one hour when the end is empty or no longer after the start.
    if (v && (!f.end_time || f.end_time <= v)) {
      const m = Math.min(toMin(v) + 60, 23 * 60 + 55)
      set('end_time', `${pad(Math.floor(m / 60))}:${pad(m % 60)}`)
    }
  }

  const submit = async e => {
    e.preventDefault()
    const errs = {}
    if (!f.date) errs.date = 'Pick the date.'
    else if (f.date < todayISO()) errs.date = 'Permission cannot be for a past date.'
    if (!f.start_time) errs.start_time = 'Pick the start time.'
    else if (isToday && f.start_time < nowHM()) errs.start_time = `That time has passed. Pick ${fmtTime(nowHM())} or later.`
    if (!f.end_time) errs.end_time = 'Pick the end time.'
    else if (f.start_time && minutes <= 0) errs.end_time = 'Must be after the "from" time.'
    if (!f.subject.trim()) errs.subject = 'Subject is required.'
    if (!f.reason.trim()) errs.reason = 'Reason is required.'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setBusy(true)
    try {
      await api('/leaves', { method: 'POST', body: { type: 'permission', ...f } })
      toast.success(`Permission applied for ${fmtMinutes(minutes)} on ${fmtDate(f.date)}.`)
      onSaved()
    } catch (x) { setBusy(false); toast.error(x.message) }
  }

  return (
    <Modal title="Apply permission" sub="A few hours away on a working day." onClose={onClose} size="max-w-xl">
      <form onSubmit={submit} noValidate className="flex flex-col max-h-[80vh]">
        <div className="p-5 space-y-4 overflow-y-auto">
          <DatePicker label="Date" req value={f.date} error={errors.date} min={todayISO()} maxYear={year + 1} onChange={pickDate} />
          <div className="grid sm:grid-cols-2 gap-4">
            <TimeSelect label="From time" req value={f.start_time} error={errors.start_time} onChange={pickStart} min={startMin}
              hint={isToday ? `Today: from ${fmtTime(nowHM())} onwards` : undefined} />
            <TimeSelect label="To time" req value={f.end_time} error={errors.end_time} onChange={v => set('end_time', v)} min={f.start_time || startMin} />
          </div>
          {minutes > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
              <Clock size={16} className="shrink-0" />Away for <b>{fmtMinutes(minutes)}</b>{f.date && <> on {fmtDate(f.date)}</>}
            </div>
          )}
          <Input label="Subject" req value={f.subject} error={errors.subject} onChange={e => set('subject', e.target.value)} placeholder="e.g. Bank work" maxLength={160} />
          <Textarea label="Reason" req value={f.reason} error={errors.reason} onChange={e => set('reason', e.target.value)} placeholder="A short note for your approver" maxLength={2000} />
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Applying…' : 'Apply permission'}</Button>
        </div>
      </form>
    </Modal>
  )
}

/* ---------- Approve / reject ---------- */

function DecisionDialog({ x, status, onClose, onDone }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const approve = status === 'approved'
  const cancelling = status === 'cancelled'
  const verb = approve ? 'Approve' : cancelling ? 'Cancel' : 'Decline'
  const go = async () => {
    setBusy(true)
    try {
      const body = { note: note.trim() || undefined }
      if (cancelling) await api(`/leaves/${x.id}/cancel`, { method: 'POST', body })
      else await api(`/leaves/${x.id}/decision`, { method: 'POST', body: { status, ...body } })
      toast.success(`${x.user_name}'s ${x.type} ${approve ? 'approved' : cancelling ? 'cancelled' : 'rejected'}.`)
      onDone()
    } catch (e) { setBusy(false); toast.error(e.message) }
  }
  return (
    <Modal title={`${verb} ${x.type}?`} sub={`${x.user_name} · ${x.subject} · now ${STATUS[x.status].label.toLowerCase()}`} onClose={onClose} size="max-w-md">
      <div className="p-5 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
          {x.type === 'leave'
            ? <>{fmtDate(x.from_date)}{x.to_date !== x.from_date && <> → {fmtDate(x.to_date)}</>} · <b className="text-slate-800">{plural(x.days, 'day')}</b></>
            : <>{fmtDate(x.from_date)} · {fmtTime(x.start_time)} – {fmtTime(x.end_time)} · <b className="text-slate-800">{fmtMinutes(x.minutes)}</b></>}
          <p className="mt-1 text-slate-500">{x.reason}</p>
        </div>
        <Textarea label={`Note to ${x.user_name.split(' ')[0]} (optional)`} rows={2} value={note} onChange={e => setNote(e.target.value)} maxLength={255}
          placeholder={approve ? 'e.g. Enjoy your time off' : cancelling ? 'e.g. Plans changed, cancelled on request' : 'e.g. Release week, please pick other dates'} />
        {cancelling && x.type === 'leave' && <p className="text-sm text-slate-500">{plural(x.days, 'day')} will go back to {x.user_name.split(' ')[0]}'s balance.</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Keep as is</Button>
          <Button type="button" variant={approve ? 'success' : 'danger'} onClick={go} disabled={busy}>{busy ? 'Saving…' : cancelling ? `Cancel ${x.type}` : verb}</Button>
        </div>
      </div>
    </Modal>
  )
}
