import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ChevronRight, Play, Pause, Square, PlusCircle, Pencil, Trash2, Link2, Download, MessageSquare, Clock, History as HistoryIcon, FileText, Send, StickyNote } from 'lucide-react'
import { api, fmtDate, localDay } from '../lib/api.js'
import { toast } from '../lib/toast.js'
import { useAuth } from '../auth.jsx'
import { Card, Button, Input, Textarea, Table, Modal, ConfirmDialog, Dropdown, MultiSelect, DatePicker, Avatar } from '../components/ui.jsx'
import { useQuickAdd } from '../components/QuickAdd.jsx'
import { STATUSES, STATUS, TYPES, PRIORITIES, REPORTERS, TypeTag, PriorityTag, StatusTag, dur, clock, fmtDT } from '../lib/tickets.jsx'
import { AttachPicker, sendForm, fileIcon } from './Tickets.jsx'

const opts = obj => Object.entries(obj).map(([value, x]) => ({ value, label: typeof x === 'string' ? x : x.label }))
const ACTION = {
  start: { label: 'Started timer', icon: Play, cls: 'bg-green-100 text-green-700' },
  pause: { label: 'Paused', icon: Pause, cls: 'bg-amber-100 text-amber-700' },
  resume: { label: 'Resumed', icon: Play, cls: 'bg-indigo-100 text-indigo-700' },
  stop: { label: 'Stopped timer', icon: Square, cls: 'bg-red-100 text-red-700' },
  manual: { label: 'Logged time', icon: PlusCircle, cls: 'bg-slate-100 text-slate-700' },
}
const dayOf = v => localDay(v)

export default function TicketDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { user } = useAuth()
  const [d, setD] = useState(null)
  const [tab, setTab] = useState('details')
  const [busy, setBusy] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [asking, setAsking] = useState(null) // 'start' | 'pause' | 'resume'
  const [logging, setLogging] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(null)
  const fetchedAt = useRef(Date.now())
  const [, tick] = useState(0)

  const load = () => api(`/tickets/${id}`).then(x => { fetchedAt.current = Date.now(); setD(x) }).catch(e => { toast.error(e.message); if (e.status === 404) nav('/tickets') })
  useEffect(() => { load() }, [id])
  const running = d?.my_timer.state === 'running'
  useEffect(() => { if (!running) return; const i = setInterval(() => tick(n => n + 1), 1000); return () => clearInterval(i) }, [running])

  if (!d) return <div className="p-10 text-center text-slate-400">Loading…</div>
  const t = d.ticket
  const live = running ? (Date.now() - fetchedAt.current) / 1000 : 0
  const session = d.my_timer.session_seconds + live
  const total = d.total_seconds + live

  const timer = async (action, note) => {
    setBusy(true)
    try { await api(`/tickets/${t.id}/timer`, { method: 'POST', body: { action, ...(note && { note }) } }); await load(); return true }
    catch (e) { toast.error(e.message); return false }
    finally { setBusy(false) }
  }
  const setStatus = async status => {
    try { await api(`/tickets/${t.id}/status`, { method: 'POST', body: { status } }); toast.success(`Moved to ${STATUS[status].label}.`); load() }
    catch (e) { toast.error(e.message) }
  }
  const removeTicket = () => setConfirming({
    title: `Delete ${t.ticket_no}?`, message: 'The ticket, its time logs, comments and attachments will be removed permanently.', confirmLabel: 'Delete ticket',
    onConfirm: async () => { try { await api(`/tickets/${t.id}`, { method: 'DELETE' }); toast.success(`${t.ticket_no} deleted.`); nav('/tickets') } catch (e) { toast.error(e.message) } },
  })

  const TABS = [
    { v: 'details', label: 'Details' },
    { v: 'time', label: 'Time Logs', n: d.time_logs.length },
    { v: 'comments', label: 'Comments', n: d.comments.length },
    { v: 'history', label: 'History' },
  ]

  return (
    <div className="max-w-6xl">
      <nav className="flex items-center gap-1.5 text-sm text-slate-500 mb-4" aria-label="Breadcrumb">
        <Link to="/tickets" className="hover:text-indigo-600">Tickets</Link><ChevronRight size={14} />
        <span className="font-semibold text-slate-800">{t.ticket_no}</span>
      </nav>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          {/* Header */}
          <Card className="p-5">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg font-bold text-indigo-600">{t.ticket_no}</span>
                  <TypeTag type={t.type} /><PriorityTag priority={t.priority} />
                </div>
                <h1 className="text-xl font-semibold text-slate-900 mt-1.5 break-words">{t.title}</h1>
              </div>
              {d.can.status
                ? <Dropdown className="w-44" value={t.status} onChange={setStatus} options={STATUSES.map(s => ({ value: s.v, label: s.label }))} />
                : <StatusTag status={t.status} />}
            </div>
            <dl className="mt-4 grid sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-2.5 text-sm">
              <Field k="Project">{t.project_name}{t.client_name ? <span className="text-slate-500"> · {t.client_name}</span> : null}</Field>
              <Field k="Reported by">{REPORTERS[t.reported_by]}{t.reporter_name ? ` · ${t.reporter_name}` : ''}</Field>
              <Field k="Priority"><PriorityTag priority={t.priority} /></Field>
              <Field k="Raised">{fmtDT(t.created_at)}{t.created_by_name ? ` by ${t.created_by_name}` : ''}</Field>
              <Field k="Due">{t.due_date ? fmtDate(t.due_date) : '—'}</Field>
              {t.completed_at && <Field k="Completed">{fmtDT(t.completed_at)}</Field>}
            </dl>
            {(d.can.edit || d.can.delete) && (
              <div className="mt-4 flex gap-2">
                {d.can.edit && <Button onClick={() => setEditing(true)}><Pencil size={14} className="inline -mt-0.5 mr-1" />Edit</Button>}
                {d.can.delete && <Button variant="ghost" onClick={removeTicket} className="text-red-600"><Trash2 size={14} className="inline -mt-0.5 mr-1" />Delete</Button>}
              </div>
            )}
          </Card>

          {/* Tabs */}
          <Card className="p-0 overflow-hidden">
            <div className="flex gap-1 border-b border-slate-200 px-3 overflow-x-auto" role="tablist">
              {TABS.map(x => (
                <button key={x.v} role="tab" aria-selected={tab === x.v} onClick={() => setTab(x.v)}
                  className={`px-3.5 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition ${tab === x.v ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                  {x.label}{x.n ? <span className="ml-1.5 text-xs text-slate-400">{x.n}</span> : null}
                </button>
              ))}
            </div>
            <div className="p-5">
              {tab === 'details' && <Details d={d} reload={load} me={user} />}
              {tab === 'time' && <TimeLogs d={d} live={live} me={user} />}
              {tab === 'comments' && <Comments d={d} reload={load} />}
              {tab === 'history' && <History d={d} />}
            </div>
          </Card>
        </div>

        {/* Timer side card */}
        <div className="space-y-4 lg:sticky lg:top-6">
          <Card className="p-5">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Your timer</div>
            <div className={`mt-2 font-mono text-4xl font-semibold tabular-nums ${running ? 'text-green-700' : d.my_timer.state === 'paused' ? 'text-amber-700' : 'text-slate-800'}`}>{clock(session)}</div>
            <div className="text-xs text-slate-500 mt-1">{running ? 'Running' : d.my_timer.state === 'paused' ? 'Paused, resume when you are back' : 'Not started'}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {d.my_timer.state === 'idle' && <Button variant="primary" disabled={busy} onClick={() => setAsking('start')}><Play size={15} className="inline -mt-0.5 mr-1" />Start timer</Button>}
              {running && <Button disabled={busy} onClick={() => setAsking('pause')}><Pause size={15} className="inline -mt-0.5 mr-1" />Pause</Button>}
              {d.my_timer.state === 'paused' && <Button variant="primary" disabled={busy} onClick={() => setAsking('resume')}><Play size={15} className="inline -mt-0.5 mr-1" />Resume</Button>}
              {d.my_timer.state !== 'idle' && <Button variant="danger" disabled={busy} onClick={() => setStopping(true)}><Square size={14} className="inline -mt-0.5 mr-1" />Stop</Button>}
              <Button variant="ghost" onClick={() => setLogging(true)}><PlusCircle size={15} className="inline -mt-0.5 mr-1" />Log time</Button>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-slate-600">Total time spent</span>
              <span className="text-xl font-semibold tabular-nums text-slate-900">{dur(total)}</span>
            </div>
            <div className="mt-3 space-y-2.5">
              {d.per_user.map(u => (
                <div key={u.user_id} className="flex items-center gap-2.5">
                  <Avatar photo={u.photo} name={u.user_name} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800 truncate">{u.user_name}</div>
                    <div className="text-xs text-slate-500 truncate">{u.role_name || '—'}</div>
                  </div>
                  <span className="text-sm tabular-nums text-slate-700">{dur(u.seconds + (u.user_id === user.id ? live : 0))}</span>
                </div>
              ))}
              {!d.per_user.length && <p className="text-sm text-slate-400">No time logged yet.</p>}
            </div>
          </Card>
          {d.assignees.length > 0 && (
            <Card className="p-5">
              <div className="text-sm font-medium text-slate-600 mb-2.5">Assigned to</div>
              <div className="space-y-2">
                {d.assignees.map(a => (
                  <div key={a.id} className="flex items-center gap-2.5"><Avatar photo={a.photo} name={a.name} size={26} />
                    <div className="min-w-0"><div className="text-sm text-slate-800 truncate">{a.name}</div><div className="text-xs text-slate-500">{a.role_name || a.emp_no}</div></div></div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {asking && <TimerConfirm action={asking} ticket={t} session={session} onClose={() => setAsking(null)}
        onConfirm={async () => { if (await timer(asking)) { toast.success(asking === 'pause' ? 'Timer paused.' : asking === 'resume' ? 'Timer resumed.' : 'Timer started.'); setAsking(null) } }} />}
      {stopping && <StopDialog onClose={() => setStopping(false)} onStop={async note => { if (await timer('stop', note)) { setStopping(false); toast.success('Timer stopped and time saved.') } }} session={session} />}
      {logging && <LogTimeDialog ticket={t} onClose={() => setLogging(false)} onDone={() => { setLogging(false); load() }} />}
      {editing && <EditTicket d={d} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load() }} />}
      {confirming && <ConfirmDialog {...confirming} onClose={() => setConfirming(null)} />}
    </div>
  )
}

const Field = ({ k, children }) => (
  <div className="min-w-0"><dt className="text-xs text-slate-500">{k}</dt><dd className="text-slate-800 truncate">{children}</dd></div>
)

/* ---------- Details tab: description + attachments ---------- */
function Details({ d, reload, me }) {
  const [files, setFiles] = useState([])
  const [links, setLinks] = useState([])
  const [busy, setBusy] = useState(false)
  const [adding, setAdding] = useState(false)
  const save = async () => {
    const ls = links.map(l => l.trim()).filter(Boolean)
    if (!files.length && !ls.length) { toast.error('Choose a file or enter a link.'); return }
    const fd = new FormData()
    files.forEach(x => fd.append('files', x)); fd.append('links', JSON.stringify(ls))
    setBusy(true)
    try { await sendForm(`/tickets/${d.ticket.id}/attachments`, fd); toast.success('Attachments added.'); setFiles([]); setLinks([]); setAdding(false); reload() }
    catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  const remove = async a => {
    try { await api(`/tickets/${d.ticket.id}/attachments/${a.id}`, { method: 'DELETE' }); toast.success('Removed.'); reload() } catch (e) { toast.error(e.message) }
  }
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-1.5">Issue details</h3>
        {d.ticket.description ? <p className="text-sm text-slate-700 whitespace-pre-line break-words">{d.ticket.description}</p> : <p className="text-sm text-slate-400">No details added.</p>}
      </section>
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-800">Attachments <span className="text-slate-400 font-normal">({d.attachments.length})</span></h3>
          {d.can.attach && !adding && <button onClick={() => setAdding(true)} className="text-sm font-medium text-indigo-600 hover:underline">Add files or links</button>}
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {d.attachments.map(a => {
            const I = a.kind === 'link' ? Link2 : fileIcon(a.mime_type)
            const href = a.kind === 'link' ? a.url : `/api/tickets/files/${a.id}`
            return (
              <div key={a.id} className="flex items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2">
                <I size={16} className="text-slate-500 shrink-0" />
                <a href={href} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 text-sm text-indigo-600 hover:underline truncate" title={a.original_name || a.url}>{a.original_name || a.url.replace(/^https?:\/\//, '')}</a>
                {a.kind === 'file' && <a href={`${href}?download=1`} className="text-slate-400 hover:text-indigo-600 p-0.5" title="Download"><Download size={14} /></a>}
                {(d.can.delete || a.uploaded_by_name === me.name) && <button onClick={() => remove(a)} className="text-slate-400 hover:text-red-600 p-0.5" title="Remove"><Trash2 size={14} /></button>}
              </div>
            )
          })}
        </div>
        {!d.attachments.length && !adding && <p className="text-sm text-slate-400">No attachments.</p>}
        {adding && (
          <div className="mt-3 space-y-3">
            <AttachPicker files={files} setFiles={setFiles} links={links} setLinks={setLinks} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setAdding(false); setFiles([]); setLinks([]) }}>Cancel</Button>
              <Button variant="primary" disabled={busy} onClick={save}>{busy ? 'Uploading…' : 'Add'}</Button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

/* ---------- Time Logs tab ---------- */
function TimeLogs({ d, live, me }) {
  return (
    <div className="space-y-6">
      {d.per_user.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-slate-800 mb-2">By person</h3>
          <Table head={['User', 'Role', 'Total', 'Sessions', 'Starts', 'Pauses', 'Resumes', 'Stops']}>
            {d.per_user.map(u => (
              <tr key={u.user_id}>
                <td><div className="flex items-center gap-2"><Avatar photo={u.photo} name={u.user_name} size={26} /><span className="font-medium text-slate-800">{u.user_name}</span></div></td>
                <td className="text-slate-600">{u.role_name || '—'}</td>
                <td className="font-semibold tabular-nums text-slate-800">{dur(u.seconds + (u.user_id === me.id ? live : 0))}</td>
                {['sessions', 'starts', 'pauses', 'resumes', 'stops'].map(k => <td key={k} className="tabular-nums text-slate-600">{u[k]}</td>)}
              </tr>
            ))}
          </Table>
        </section>
      )}
      <section>
        <h3 className="text-sm font-semibold text-slate-800 mb-2">Every stretch of work</h3>
        {!d.time_logs.length ? <p className="text-sm text-slate-400">No time logged yet. Use Start timer or Log time.</p> : (
          <Table head={['User', 'Duration', 'Date', 'From – to', 'Notes']}>
            {d.time_logs.map(l => (
              <tr key={l.id} className="align-top">
                <td><div className="flex items-center gap-2"><Avatar photo={l.photo} name={l.user_name} size={26} />
                  <div><div className="font-medium text-slate-800">{l.user_name}</div><div className="text-xs text-slate-500">{l.role_name || '—'}</div></div></div></td>
                <td className="tabular-nums whitespace-nowrap font-medium text-slate-800">{dur(l.seconds + (!l.ended_at && l.user_id === me.id ? live : 0))}{!l.ended_at && <span className="ml-1.5 text-xs text-green-700">running</span>}</td>
                <td className="whitespace-nowrap text-slate-600">{fmtDate(dayOf(l.started_at))}</td>
                <td className="whitespace-nowrap text-slate-600">{l.source === 'manual' ? <span className="text-xs rounded bg-slate-100 px-1.5 py-0.5">Logged by hand</span>
                  : <>{fmtDT(l.started_at).split(', ').pop()} – {l.ended_at ? fmtDT(l.ended_at).split(', ').pop() : 'now'}</>}</td>
                <td className="text-slate-600 max-w-[280px]"><span className="line-clamp-2">{l.note || '—'}</span></td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </div>
  )
}

/* ---------- Comments tab ---------- */
function Comments({ d, reload }) {
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const send = async e => {
    e.preventDefault()
    if (!body.trim()) return
    setBusy(true)
    try { await api(`/tickets/${d.ticket.id}/comments`, { method: 'POST', body: { body: body.trim() } }); setBody(''); reload() }
    catch (x) { toast.error(x.message) } finally { setBusy(false) }
  }
  return (
    <div className="space-y-4">
      {d.comments.map(c => (
        <div key={c.id} className="flex gap-3">
          <Avatar photo={c.photo} name={c.user_name} size={32} />
          <div className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5">
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
              <b className="text-sm text-slate-800">{c.user_name}</b>{c.role_name && <span>· {c.role_name}</span>}<span>· {fmtDT(c.created_at)}</span>
              {c.source === 'time_note' && <span className="inline-flex items-center gap-1 rounded bg-amber-50 text-amber-700 px-1.5 py-0.5"><StickyNote size={11} />Work note</span>}
            </div>
            <p className="text-sm text-slate-700 mt-1 whitespace-pre-line break-words">{c.body}</p>
          </div>
        </div>
      ))}
      {!d.comments.length && <p className="text-sm text-slate-400">No comments yet. Notes added when stopping the timer also appear here.</p>}
      <form onSubmit={send} className="flex gap-2 items-end pt-2">
        <Textarea className="flex-1" rows={2} value={body} onChange={e => setBody(e.target.value)} maxLength={5000} placeholder="Write a comment or note…"
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(e) }} aria-label="Comment" />
        <Button type="submit" variant="primary" disabled={busy || !body.trim()} title="Send (Ctrl+Enter)"><Send size={15} className="inline -mt-0.5 mr-1" />Send</Button>
      </form>
    </div>
  )
}

/* ---------- History tab: timer clicks + ticket changes, by day ---------- */
function History({ d }) {
  const items = [
    ...d.time_events.map(e => ({ key: `e${e.id}`, at: e.at, who: e.user_name, ...ACTION[e.action], note: e.note })),
    ...d.activity.map(a => ({ key: `a${a.id}`, at: a.at, who: a.user_name, label: a.action === 'created' ? 'Raised the ticket' : a.action === 'status' ? 'Changed status' : a.action === 'edited' ? 'Edited' : a.action[0].toUpperCase() + a.action.slice(1), icon: a.action === 'status' ? Clock : a.action === 'created' ? FileText : Pencil, cls: 'bg-indigo-50 text-indigo-700', note: a.action === 'created' ? null : a.detail })),
  ].sort((a, b) => String(b.at).localeCompare(String(a.at)))
  const days = [...new Set(items.map(i => dayOf(i.at)))]
  if (!items.length) return <p className="text-sm text-slate-400">Nothing yet.</p>
  return (
    <div className="space-y-5">
      {days.map(day => (
        <section key={day}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{fmtDate(day)}</h3>
          <ol className="relative border-l border-slate-200 ml-3 space-y-3">
            {items.filter(i => dayOf(i.at) === day).map(i => (
              <li key={i.key} className="ml-5">
                <span className={`absolute -left-3 w-6 h-6 rounded-full grid place-items-center ${i.cls}`}><i.icon size={12} /></span>
                <div className="text-sm text-slate-800"><b>{i.who || 'Someone'}</b> · {i.label}<span className="text-slate-500"> · {fmtDT(i.at).split(', ').pop()}</span></div>
                {i.note && <div className="text-sm text-slate-600 mt-0.5 break-words">{i.note}</div>}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}

/* ---------- Dialogs ---------- */
const ASK = {
  start: { title: 'Start the timer?', text: 'Your time on this ticket will start counting now.', btn: 'Start timer', busy: 'Starting…', icon: Play, variant: 'primary', cls: 'bg-green-100 text-green-700' },
  pause: { title: 'Pause the timer?', text: 'The time stops counting until you resume. This session is kept.', btn: 'Pause', busy: 'Pausing…', icon: Pause, variant: 'default', cls: 'bg-amber-100 text-amber-700' },
  resume: { title: 'Resume the timer?', text: 'Your time continues from where you paused.', btn: 'Resume', busy: 'Resuming…', icon: Play, variant: 'primary', cls: 'bg-indigo-100 text-indigo-700' },
}
function TimerConfirm({ action, ticket, session, onClose, onConfirm }) {
  const a = ASK[action]
  const [busy, setBusy] = useState(false)
  const go = async () => { setBusy(true); await onConfirm(); setBusy(false) }
  return (
    <Modal title={a.title} sub={`${ticket.ticket_no} · ${ticket.title}`} onClose={busy ? () => {} : onClose} size="max-w-sm">
      <div className="p-5 space-y-4 text-center">
        <span className={`w-12 h-12 mx-auto rounded-full grid place-items-center ${a.cls}`}><a.icon size={22} /></span>
        <p className="text-sm text-slate-600">{a.text}</p>
        {action !== 'start' && <p className="font-mono text-2xl font-semibold tabular-nums text-slate-800">{clock(session)}</p>}
        <div className="flex gap-2 justify-center">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant={a.variant} onClick={go} disabled={busy} autoFocus>{busy ? a.busy : a.btn}</Button>
        </div>
      </div>
    </Modal>
  )
}

function StopDialog({ onClose, onStop, session }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Modal title="Stop timer" sub={`This session: ${dur(session)}`} onClose={onClose} size="max-w-md">
      <div className="p-5 space-y-4">
        <Textarea label="What did you do? (optional)" rows={3} value={note} onChange={e => setNote(e.target.value)} maxLength={1000} placeholder="e.g. Fixed the field mapping, testing pending" />
        <p className="text-xs text-slate-500">The note is saved with this time and also added to the comments.</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Keep running</Button>
          <Button variant="danger" disabled={busy} onClick={async () => { setBusy(true); await onStop(note.trim()); setBusy(false) }}>{busy ? 'Stopping…' : 'Stop timer'}</Button>
        </div>
      </div>
    </Modal>
  )
}

function LogTimeDialog({ ticket, onClose, onDone }) {
  const today = new Date(); const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const [f, setF] = useState({ date: iso, h: '', m: '', note: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async e => {
    e.preventDefault()
    const minutes = (Number(f.h) || 0) * 60 + (Number(f.m) || 0)
    if (!minutes) { setErr('Enter the hours or minutes spent.'); return }
    if (minutes > 1440) { setErr('At most 24 hours in one entry.'); return }
    setBusy(true)
    try { await api(`/tickets/${ticket.id}/time`, { method: 'POST', body: { date: f.date, minutes, note: f.note.trim() || undefined } }); toast.success(`${dur(minutes * 60)} logged.`); onDone() }
    catch (x) { setBusy(false); toast.error(x.message) }
  }
  const num = (k, max) => e => { setErr(''); setF(s => ({ ...s, [k]: e.target.value.replace(/\D/g, '').slice(0, 2) })); void max }
  return (
    <Modal title="Log time" sub={`${ticket.ticket_no} · for time you forgot to track`} onClose={onClose} size="max-w-md">
      <form onSubmit={submit} noValidate className="p-5 space-y-4">
        <DatePicker label="Date" value={f.date} onChange={v => setF(s => ({ ...s, date: v || iso }))} maxYear={today.getFullYear()} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Hours" inputMode="numeric" value={f.h} onChange={num('h', 24)} placeholder="0" />
          <Input label="Minutes" inputMode="numeric" value={f.m} onChange={num('m', 59)} placeholder="0" />
        </div>
        {err && <p className="text-xs text-red-600 -mt-2">{err}</p>}
        <Textarea label="Notes (optional)" rows={2} value={f.note} onChange={e => setF(s => ({ ...s, note: e.target.value }))} maxLength={1000} placeholder="What you worked on" />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Saving…' : 'Log time'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function EditTicket({ d, onClose, onSaved }) {
  const t = d.ticket
  const [f, setF] = useState({ title: t.title, description: t.description || '', type: t.type, priority: t.priority, reported_by: t.reported_by, reporter_name: t.reporter_name || '', due_date: t.due_date ? String(t.due_date).slice(0, 10) : '', assignee_ids: d.assignees.map(a => a.id) })
  const [employees, setEmployees] = useState([])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const loadEmployees = () => api('/tickets/options').then(x => setEmployees(x.employees)).catch(() => {})
  useEffect(() => { loadEmployees() }, [])
  const qa = useQuickAdd() // "+ Add new employee" inside the assignee list
  const set = (k, v) => setF(s => ({ ...s, [k]: v }))
  const submit = async e => {
    e.preventDefault()
    if (!f.title.trim()) { setErr('Issue title is required.'); return }
    setBusy(true)
    try { await api(`/tickets/${t.id}`, { method: 'PUT', body: { ...f, assignee_ids: f.assignee_ids.map(Number) } }); toast.success('Ticket updated.'); onSaved() }
    catch (x) { setBusy(false); toast.error(x.message) }
  }
  return (
    <Modal title={`Edit ${t.ticket_no}`} onClose={onClose} size="max-w-2xl">
      <form onSubmit={submit} noValidate className="p-5 space-y-4">
        <Input label="Issue" req value={f.title} error={err} onChange={e => { setErr(''); set('title', e.target.value) }} maxLength={200} />
        <Textarea label="Details (optional)" rows={4} value={f.description} onChange={e => set('description', e.target.value)} maxLength={5000} />
        <div className="grid sm:grid-cols-3 gap-3">
          <Dropdown label="Type" value={f.type} onChange={v => set('type', v)} options={opts(TYPES)} />
          <Dropdown label="Priority" value={f.priority} onChange={v => set('priority', v)} options={opts(PRIORITIES)} />
          <Dropdown label="Reported by" value={f.reported_by} onChange={v => set('reported_by', v)} options={opts(REPORTERS)} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Reporter name (optional)" value={f.reporter_name} onChange={e => set('reporter_name', e.target.value)} maxLength={160} />
          <DatePicker label="Due date (optional)" value={f.due_date} onChange={v => set('due_date', v || '')} />
        </div>
        <MultiSelect label="Assign to (optional)" value={f.assignee_ids} onChange={v => set('assignee_ids', v)} placeholder="Select employees"
          options={employees.map(e => ({ value: e.id, label: e.role_name ? `${e.name} · ${e.role_name}` : e.name }))}
          {...qa.props('employee', async id => { await loadEmployees(); setF(s => ({ ...s, assignee_ids: [...s.assignee_ids, id] })) })} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
        </div>
      </form>
      {qa.node}
    </Modal>
  )
}
