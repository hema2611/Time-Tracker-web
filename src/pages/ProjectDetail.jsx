import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Inbox, GitPullRequestArrow, ClipboardPaste, Check, X, MessageCircle, Mail, Phone, Users as UsersIcon, Quote } from 'lucide-react'
import { api, fmtDate } from '../lib/api.js'
import { useAuth } from '../auth.jsx'
import { Card, Pill, Button } from '../components/ui.jsx'

const KIND = { cr: ['info', 'Change request'], bug: ['late', 'Bug'], decision: ['ok', 'Decision'], client_owes: ['risk', 'Client owes'] }
const SOURCE = { whatsapp: ['WhatsApp', MessageCircle], email: ['Email', Mail], call: ['Call', Phone], meeting: ['Meeting', UsersIcon], portal: ['Portal', GitPullRequestArrow], other: ['Other', Quote] }
const STATUS = {
  raised: ['neutral', 'Raised'], estimated: ['info', 'Estimated'], approved: ['ok', 'Client approved'], in_progress: ['info', 'In progress'],
  done: ['ok', 'Done'], closed: ['done', 'Closed'], rejected: ['late', 'Rejected'], cancelled: ['done', 'Cancelled'],
}
// What can happen next, and the button that does it.
const ACTIONS = {
  raised: [['estimated', 'Add estimate'], ['rejected', 'Reject'], ['cancelled', 'Cancel']],
  estimated: [['approved', 'Mark client approved'], ['rejected', 'Reject'], ['cancelled', 'Cancel']],
  approved: [['in_progress', 'Start work'], ['cancelled', 'Cancel']],
  in_progress: [['done', 'Mark done'], ['cancelled', 'Cancel']],
  done: [['closed', 'Close'], ['in_progress', 'Reopen']],
}
const TYPE = { new: 'New work', change: 'Change to existing', revert: 'Undo an earlier change' }
const fieldCls = 'w-full border border-slate-200 rounded-xl px-3 py-2'

const SourceTag = ({ s }) => { const [l, Icon] = SOURCE[s] || SOURCE.other; return <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Icon size={13} />{l}</span> }

export default function ProjectDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [project, setProject] = useState(null)
  const [tab, setTab] = useState('inbox')
  const [items, setItems] = useState(null)
  const [crs, setCrs] = useState(null)
  const [err, setErr] = useState('')
  const canWrite = project && (user.role === 'admin' || project.tlId === user.id)

  const loadInbox = () => api(`/projects/${id}/inbox`).then(d => setItems(d.items)).catch(e => setErr(e.message))
  const loadCrs = () => api(`/projects/${id}/crs`).then(d => setCrs(d.crs)).catch(e => setErr(e.message))
  useEffect(() => { api(`/projects/${id}`).then(d => setProject(d.project)).catch(e => setErr(e.message)); loadInbox(); loadCrs() }, [id])

  if (err && !project) return <Card className="p-6 text-red-600">{err}</Card>
  if (!project) return <p className="text-slate-400">Loading…</p>
  const pending = (items || []).filter(i => i.status === 'pending').length
  const openCrs = (crs || []).filter(c => !['closed', 'rejected', 'cancelled'].includes(c.status)).length

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs text-slate-500 mb-1"><Link to="/projects" className="hover:text-slate-800">Projects</Link> / {project.name}</div>
        <h1 className="text-2xl font-semibold text-slate-900">{project.name} <span className="text-slate-400 font-normal text-lg">for {project.client}</span></h1>
        <p className="text-slate-500 mt-0.5">Team lead {project.tl}{project.golive && <>, go-live {fmtDate(project.golive)}</>}</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200" role="tablist">
        {[['inbox', 'Inbox', Inbox, pending], ['crs', 'Change requests', GitPullRequestArrow, openCrs]].map(([k, l, Icon, n]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`flex items-center gap-2 px-4 py-2.5 -mb-px border-b-2 ${tab === k ? 'border-indigo-600 text-slate-900 font-medium' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <Icon size={16} />{l}{n > 0 && <span className="text-xs rounded-full px-1.5 py-0.5 bg-indigo-50 text-indigo-700">{n}</span>}
          </button>
        ))}
      </div>

      {err && <div className="bg-red-50 text-red-700 rounded-xl px-4 py-2.5" role="alert">{err}</div>}
      {tab === 'inbox'
        ? <InboxTab id={id} items={items} canWrite={canWrite} reload={() => { loadInbox(); loadCrs() }} goCrs={() => setTab('crs')} />
        : <CrTab id={id} crs={crs} canWrite={canWrite} reload={loadCrs} />}
    </div>
  )
}

// ---------- Inbox: paste messages, the AI suggests, the team lead decides ----------
function InboxTab({ id, items, canWrite, reload, goCrs }) {
  const [text, setText] = useState('')
  const [source, setSource] = useState('whatsapp')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)
  const [filter, setFilter] = useState('pending')

  const read = async () => {
    setBusy(true); setNote(null)
    try {
      const r = await api(`/projects/${id}/inbox`, { method: 'POST', body: { text, source } })
      setNote(r.added ? { ok: true, text: `Found ${r.added} item${r.added > 1 ? 's' : ''} to review.` } : { ok: true, text: 'Nothing to track in that text: no requests, bugs, decisions or promises.' })
      if (r.added) { setText(''); setFilter('pending') }
      reload()
    } catch (e) { setNote({ ok: false, text: e.message }) }
    setBusy(false)
  }
  const shown = (items || []).filter(i => filter === 'all' || i.status === filter)

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(340px,420px)_1fr] items-start">
      {canWrite && (
        <Card className="p-5 xl:sticky xl:top-5">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2"><ClipboardPaste size={17} className="text-indigo-600" />Paste messages</h2>
          <p className="text-slate-500 text-xs mt-1 mb-3">Copy messages from the WhatsApp group or an email and paste them here. The AI picks out change requests, bugs, decisions and promises. Nothing is added until you accept it.</p>
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {['whatsapp', 'email', 'call', 'meeting'].map(s => {
              const [l, Icon] = SOURCE[s]
              return <button key={s} onClick={() => setSource(s)} aria-pressed={source === s} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs ${source === s ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}><Icon size={13} />{l}</button>
            })}
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={11} aria-label="Pasted messages"
            placeholder={'[24/11/26, 10:15] Ravi (Client): Can you add an Excel export on the invoice list?\n[24/11/26, 10:16] Arun: Sure, will check\n[24/11/26, 10:20] Ravi (Client): Also the login is not working on my phone'}
            className={`${fieldCls} font-mono text-xs leading-relaxed`} />
          {note && <p className={`text-xs mt-2 ${note.ok ? 'text-green-700' : 'text-red-600'}`} role="status">{note.text}</p>}
          <Button variant="primary" className="w-full mt-3 py-2" disabled={busy || text.trim().length < 5} onClick={read}>{busy ? 'Reading the messages…' : 'Find what to track'}</Button>
        </Card>
      )}

      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h2 className="font-semibold text-slate-900">Suggestions</h2>
          <div className="flex gap-1">
            {[['pending', 'To review'], ['accepted', 'Accepted'], ['rejected', 'Rejected'], ['all', 'All']].map(([k, l]) =>
              <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k} className={`px-3 py-1 rounded-lg text-xs ${filter === k ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100'}`}>{l}</button>)}
          </div>
        </div>
        {!items ? <p className="text-slate-400">Loading…</p> : shown.length === 0 ? (
          <Card className="p-10 text-center text-slate-500">{filter === 'pending' ? (canWrite ? 'Nothing to review. Paste messages on the left to start.' : 'Nothing to review.') : 'Nothing here.'}</Card>
        ) : (
          <div className="space-y-3">{shown.map(i => <InboxCard key={i.id} id={id} i={i} canWrite={canWrite} reload={reload} goCrs={goCrs} />)}</div>
        )}
      </div>
    </div>
  )
}

function InboxCard({ id, i, canWrite, reload, goCrs }) {
  const [title, setTitle] = useState(i.title)
  const [type, setType] = useState('new')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const decide = async action => {
    setBusy(true); setErr('')
    try { await api(`/projects/${id}/inbox/${i.id}/decide`, { method: 'POST', body: { action, ...(action === 'accept' ? { title, type } : {}) } }); reload() } catch (e) { setErr(e.message); setBusy(false) }
  }
  const pending = i.status === 'pending'
  return (
    <Card className={`p-4 ${pending ? '' : 'opacity-70'}`}>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Pill tone={KIND[i.kind][0]}>{KIND[i.kind][1]}</Pill>
        <SourceTag s={i.source} />
        {i.confidence === 'low' && <span className="text-xs text-amber-700">AI is unsure</span>}
        <span className="ml-auto text-xs text-slate-500">
          {i.status === 'accepted' ? (i.crNumber ? <button onClick={goCrs} className="text-green-700 hover:underline">Accepted as CR-{i.crNumber}</button> : <span className="text-green-700">Kept on record</span>) : i.status === 'rejected' ? 'Not needed' : null}
        </span>
      </div>
      {pending && canWrite
        ? <input aria-label="Title" value={title} onChange={e => setTitle(e.target.value)} className={`${fieldCls} font-medium text-slate-900`} />
        : <div className="font-medium text-slate-900">{i.title}</div>}
      {i.detail && <p className="text-slate-500 text-xs mt-1.5">{i.detail}</p>}
      <blockquote className="mt-3 border-l-2 border-indigo-400 pl-3 text-slate-600 text-[13px] whitespace-pre-wrap">
        {i.quote}
        <footer className="text-xs text-slate-400 mt-1">{[i.saidBy, i.saidAt].filter(Boolean).join(', ') || 'Sender not shown in the pasted text'}</footer>
      </blockquote>
      {err && <p className="text-red-600 text-xs mt-2" role="alert">{err}</p>}
      {pending && canWrite && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {i.kind === 'cr' && <select aria-label="Type of change" value={type} onChange={e => setType(e.target.value)} className="border border-slate-200 rounded-xl px-2 py-1.5 text-xs">
            {Object.entries(TYPE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>}
          <Button variant="primary" disabled={busy || !title.trim()} onClick={() => decide('accept')} className="flex items-center gap-1.5"><Check size={15} />{i.kind === 'cr' ? 'Accept as change request' : 'Keep on record'}</Button>
          <Button variant="ghost" disabled={busy} onClick={() => decide('reject')} className="flex items-center gap-1.5"><X size={15} />Not needed</Button>
        </div>
      )}
    </Card>
  )
}

// ---------- Change requests ----------
function CrTab({ id, crs, canWrite, reload }) {
  const [open, setOpen] = useState(null)
  const [adding, setAdding] = useState(false)
  const empty = { title: '', description: '', type: 'new', source: 'call', raisedBy: '' }
  const [f, setF] = useState(empty)
  const [err, setErr] = useState('')
  const add = async e => {
    e.preventDefault(); setErr('')
    try { const r = await api(`/projects/${id}/crs`, { method: 'POST', body: { ...f, description: f.description || undefined, raisedBy: f.raisedBy || undefined } }); setAdding(false); setF(empty); reload(); setOpen(r.id) } catch (x) { setErr(x.message) }
  }
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_minmax(360px,460px)] items-start">
      <div className="min-w-0">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-slate-900">Change requests</h2>
          {canWrite && <Button onClick={() => setAdding(!adding)}>{adding ? 'Close' : '+ Add by hand'}</Button>}
        </div>
        {adding && (
          <Card className="p-4 mb-3">
            <form onSubmit={add} className="grid gap-3 md:grid-cols-2">
              <label className="md:col-span-2 block"><span className="block text-xs text-slate-600 mb-1">Title *</span><input required value={f.title} onChange={e => setF({ ...f, title: e.target.value })} className={fieldCls} /></label>
              <label className="md:col-span-2 block"><span className="block text-xs text-slate-600 mb-1">What exactly was asked</span><textarea rows={2} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} className={fieldCls} /></label>
              <label className="block"><span className="block text-xs text-slate-600 mb-1">Type</span><select value={f.type} onChange={e => setF({ ...f, type: e.target.value })} className={fieldCls}>{Object.entries(TYPE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
              <label className="block"><span className="block text-xs text-slate-600 mb-1">Came from</span><select value={f.source} onChange={e => setF({ ...f, source: e.target.value })} className={fieldCls}>{['call', 'meeting', 'whatsapp', 'email', 'other'].map(s => <option key={s} value={s}>{SOURCE[s][0]}</option>)}</select></label>
              <label className="block"><span className="block text-xs text-slate-600 mb-1">Asked by</span><input value={f.raisedBy} onChange={e => setF({ ...f, raisedBy: e.target.value })} className={fieldCls} placeholder="e.g. Ravi (client)" /></label>
              <div className="flex items-end"><Button variant="primary" type="submit">Add change request</Button></div>
              {err && <p className="md:col-span-2 text-red-600 text-xs" role="alert">{err}</p>}
            </form>
          </Card>
        )}
        {!crs ? <p className="text-slate-400">Loading…</p> : crs.length === 0 ? (
          <Card className="p-10 text-center text-slate-500">No change requests yet. Accept one from the Inbox, or add one by hand.</Card>
        ) : (
          <Card>
            <ul className="divide-y divide-slate-200">
              {crs.map(c => (
                <li key={c.id}>
                  <button onClick={() => setOpen(c.id)} aria-current={open === c.id} className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-100/60 ${open === c.id ? 'bg-slate-100/80' : ''}`}>
                    <span className="font-display font-semibold text-indigo-600 w-14 shrink-0">CR-{c.number}</span>
                    <span className="flex-1 min-w-0"><span className="block text-slate-900 truncate">{c.title}</span><span className="flex items-center gap-2 text-xs text-slate-500">{TYPE[c.type]}<SourceTag s={c.source} />{c.effortDays && <span>{+c.effortDays} days</span>}</span></span>
                    <Pill tone={STATUS[c.status][0]}>{STATUS[c.status][1]}</Pill>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
      {open ? <CrDetail key={open} id={id} crId={open} canWrite={canWrite} reload={reload} onClose={() => setOpen(null)} />
        : crs?.length > 0 && <Card className="p-8 text-center text-slate-500 hidden xl:block">Choose a change request to see its details and history.</Card>}
    </div>
  )
}

function CrDetail({ id, crId, canWrite, reload, onClose }) {
  const [d, setD] = useState(null)
  const [act, setAct] = useState(null)
  const [note, setNote] = useState('')
  const [days, setDays] = useState('')
  const [chargeable, setChargeable] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const load = () => api(`/projects/${id}/crs/${crId}`).then(setD).catch(e => setErr(e.message))
  useEffect(() => { load() }, [crId])

  const move = async () => {
    setBusy(true); setErr('')
    try {
      await api(`/projects/${id}/crs/${crId}/status`, { method: 'POST', body: { to: act, note: note || undefined, ...(act === 'estimated' ? { effortDays: +days, chargeable } : {}) } })
      setAct(null); setNote(''); setDays(''); load(); reload()
    } catch (e) { setErr(e.message) }
    setBusy(false)
  }
  if (!d) return <Card className="p-6 text-slate-400">{err || 'Loading…'}</Card>
  const c = d.cr
  return (
    <Card className="p-5 xl:sticky xl:top-5">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-indigo-600">CR-{c.number}</div>
          <h3 className="text-lg font-semibold text-slate-900 leading-snug">{c.title}</h3>
        </div>
        <button onClick={onClose} aria-label="Close details" className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={16} /></button>
      </div>
      <div className="flex flex-wrap gap-2 items-center mt-2"><Pill tone={STATUS[c.status][0]}>{STATUS[c.status][1]}</Pill><span className="text-xs text-slate-500">{TYPE[c.type]}</span>{c.effortDays && <span className="text-xs text-slate-500">{+c.effortDays} working days{c.chargeable ? ', chargeable' : ''}</span>}</div>
      {c.description && <p className="text-slate-600 mt-3">{c.description}</p>}
      {c.evidence && (
        <blockquote className="mt-3 border-l-2 border-indigo-400 pl-3 text-slate-600 text-[13px] whitespace-pre-wrap">{c.evidence}
          <footer className="text-xs text-slate-400 mt-1 flex items-center gap-1.5"><SourceTag s={c.source} />{[c.raisedBy, c.raisedOn].filter(Boolean).join(', ')}</footer>
        </blockquote>
      )}

      {canWrite && ACTIONS[c.status] && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          {!act ? (
            <div className="flex flex-wrap gap-2">
              {ACTIONS[c.status].map(([to, l], k) => <Button key={to} variant={k === 0 ? 'primary' : 'default'} onClick={() => { setAct(to); setErr('') }}>{l}</Button>)}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="font-medium text-slate-900">{ACTIONS[c.status].find(a => a[0] === act)[1]}</div>
              {act === 'estimated' && (
                <div className="flex flex-wrap gap-3 items-center">
                  <label className="text-xs text-slate-600">Effort in working days <input type="number" min="0.5" step="0.5" value={days} onChange={e => setDays(e.target.value)} className="ml-1 w-24 border border-slate-200 rounded-lg px-2 py-1.5" /></label>
                  <label className="text-xs text-slate-600 flex items-center gap-1.5"><input type="checkbox" checked={chargeable} onChange={e => setChargeable(e.target.checked)} />Chargeable to the client</label>
                </div>
              )}
              <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} aria-label="Note" placeholder={['rejected', 'cancelled'].includes(act) ? 'Reason (required)' : act === 'approved' ? 'How the client approved it, e.g. "Approved by Ravi on WhatsApp, 24 Nov"' : 'Note (optional)'} className={fieldCls} />
              <div className="flex gap-2"><Button variant="primary" disabled={busy} onClick={move}>{busy ? 'Saving…' : 'Save'}</Button><Button variant="ghost" onClick={() => setAct(null)}>Cancel</Button></div>
            </div>
          )}
          {err && <p className="text-red-600 text-xs mt-2" role="alert">{err}</p>}
        </div>
      )}

      <h4 className="font-medium text-slate-900 mt-5 mb-2">History</h4>
      <ol className="relative border-l border-slate-200 ml-1.5 space-y-3">
        {d.history.map((h, k) => (
          <li key={k} className="pl-4 relative">
            <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full rail" />
            <div className="text-slate-800"><b>{STATUS[h.toStatus]?.[1] || h.toStatus}</b> <span className="text-slate-500">by {h.byName}</span></div>
            <div className="text-xs text-slate-400">{new Date(h.at.replace(' ', 'T') + 'Z').toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
            {h.note && <div className="text-xs text-slate-600 mt-0.5">{h.note}</div>}
          </li>
        ))}
      </ol>
    </Card>
  )
}
