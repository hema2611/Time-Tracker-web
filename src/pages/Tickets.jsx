import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, LayoutGrid, List, Search, Clock, MessageSquare, Paperclip, Upload, X, FileText, Image as ImageIcon, Sheet, Link2, Timer } from 'lucide-react'
import { api } from '../lib/api.js'
import { toast } from '../lib/toast.js'
import { Card, Button, PageHeader, Input, Textarea, Table, Modal, Dropdown, MultiSelect, DatePicker, Avatar } from '../components/ui.jsx'
import { useQuickAdd } from '../components/QuickAdd.jsx'
import { STATUSES, STATUS, TYPES, PRIORITIES, REPORTERS, TypeTag, PriorityTag, StatusTag, dur, clock, fmtDT } from '../lib/tickets.jsx'

const opts = obj => Object.entries(obj).map(([value, x]) => ({ value, label: typeof x === 'string' ? x : x.label }))

export default function Tickets() {
  const nav = useNavigate()
  const [perms, setPerms] = useState({ view: true, create: false, edit: false })
  const [projects, setProjects] = useState([])
  const [f, setF] = useState(() => {
    try { return { project_id: '', sort: 'desc', type: '', status: '', priority: '', q: '', mine: '', ...JSON.parse(localStorage.getItem('tickets.filters') || '{}') } }
    catch { return { project_id: '', sort: 'desc', type: '', status: '', priority: '', q: '', mine: '' } }
  })
  const [view, setView] = useState(() => localStorage.getItem('tickets.view') || 'board')
  const [data, setData] = useState({ counts: {}, total: 0, tickets: [] })
  const [loading, setLoading] = useState(true)
  const [raising, setRaising] = useState(false)
  const [timers, setTimers] = useState([])

  const set = (k, v) => setF(s => ({ ...s, [k]: v }))
  useEffect(() => { localStorage.setItem('tickets.filters', JSON.stringify(f)) }, [f])
  useEffect(() => { localStorage.setItem('tickets.view', view) }, [view])
  useEffect(() => {
    api('/permissions/me').then(p => setPerms(p.modules?.tickets || {})).catch(() => {})
    api('/tickets/options').then(d => setProjects(d.projects)).catch(() => {})
    api('/tickets/timers/mine').then(d => setTimers(d.timers)).catch(() => {})
  }, [])

  const load = () => {
    setLoading(true)
    const q = new URLSearchParams(Object.fromEntries(Object.entries(f).filter(([, v]) => v)))
    return api(`/tickets?${q}`).then(setData).catch(e => toast.error(e.message)).finally(() => setLoading(false))
  }
  useEffect(() => { const t = setTimeout(load, f.q ? 250 : 0); return () => clearTimeout(t) }, [f])

  const project = projects.find(p => String(p.id) === String(f.project_id))
  const shown = view === 'board' && f.status ? STATUSES.filter(s => s.v === f.status) : STATUSES

  return (
    <div>
      <PageHeader title="Ticketing System" sub={project ? `${project.name} · tickets ${project.prefix}-1, ${project.prefix}-2 …` : 'Every change on a project is a ticket. Track it from open to completed, with the time spent.'}
        actions={perms.create && <Button variant="primary" onClick={() => setRaising(true)}><Plus size={16} className="inline -mt-0.5 mr-1" />Raise ticket</Button>} />

      {timers.length > 0 && (
        <div className="mb-4 space-y-2">
          {timers.map(t => <ActiveTimer key={t.id} t={t} onOpen={() => nav(`/tickets/${t.id}`)} />)}
        </div>
      )}

      {/* Status counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {STATUSES.map(s => (
          <button key={s.v} type="button" onClick={() => set('status', f.status === s.v ? '' : s.v)} aria-pressed={f.status === s.v}
            className={`text-left rounded-2xl border p-4 transition ${f.status === s.v ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'} bg-surface`}>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600"><span className={`w-2 h-2 rounded-full ${s.dot}`} />{s.label}</div>
            <div className="text-2xl font-semibold tabular-nums text-slate-900 mt-1">{data.counts[s.v] ?? 0}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <Dropdown className="w-56" value={f.project_id} onChange={v => set('project_id', v)} placeholder="All projects"
          options={[{ value: '', label: 'All projects' }, ...projects.map(p => ({ value: p.id, label: p.name }))]} />
        <Dropdown className="w-40" value={f.sort} onChange={v => set('sort', v)}
          options={[{ value: 'desc', label: 'Newest first' }, { value: 'asc', label: 'Oldest first' }]} />
        <Dropdown className="w-40" value={f.type} onChange={v => set('type', v)} placeholder="All types" options={[{ value: '', label: 'All types' }, ...opts(TYPES)]} />
        <Dropdown className="w-40" value={f.status} onChange={v => set('status', v)} placeholder="All status" options={[{ value: '', label: 'All status' }, ...STATUSES.map(s => ({ value: s.v, label: s.label }))]} />
        <Dropdown className="w-40" value={f.priority} onChange={v => set('priority', v)} placeholder="All priorities" options={[{ value: '', label: 'All priorities' }, ...opts(PRIORITIES)]} />
        <label className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={f.q} onChange={e => set('q', e.target.value)} placeholder="Ticket no or title" aria-label="Search tickets"
            className="w-52 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        </label>
        <button type="button" onClick={() => set('mine', f.mine ? '' : '1')} aria-pressed={!!f.mine}
          className={`px-3 py-2 rounded-xl border text-sm font-medium transition ${f.mine ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Mine</button>
        <div className="ml-auto inline-flex bg-surface border border-slate-200 rounded-xl p-1 shadow-sm">
          {[{ v: 'board', icon: LayoutGrid, label: 'Board' }, { v: 'list', icon: List, label: 'List' }].map(t => (
            <button key={t.v} onClick={() => setView(t.v)} aria-pressed={view === t.v} title={`${t.label} view`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${view === t.v ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}><t.icon size={15} />{t.label}</button>
          ))}
        </div>
      </div>

      {loading && !data.tickets.length ? <Card className="p-8 text-center text-slate-400">Loading…</Card>
        : view === 'board' ? (
          <div className={`grid gap-3 ${shown.length === 1 ? '' : 'grid-cols-4'}`}>
            {shown.map(s => {
              const list = data.tickets.filter(t => t.status === s.v)
              return (
                <div key={s.v} className={`min-w-0 rounded-2xl ${s.col} border border-slate-200 p-2.5 min-h-[200px]`}>
                  <div className="flex items-center gap-2 px-1 pb-2.5 font-semibold text-slate-800">
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />{s.label} <span className="text-slate-500 font-normal">({list.length})</span>
                  </div>
                  <div className="space-y-2.5">
                    {list.map(t => (
                      <button key={t.id} type="button" onClick={() => nav(`/tickets/${t.id}`)}
                        className="w-full text-left rounded-xl border border-slate-200 bg-surface p-3 shadow-sm hover:border-indigo-300 hover:shadow transition">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-indigo-600">{t.ticket_no}</span>
                          <PriorityTag priority={t.priority} />
                        </div>
                        <div className="mt-1 text-sm font-medium text-slate-800 line-clamp-2">{t.title}</div>
                        <div className="mt-1.5 inline-block max-w-full truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600" title={t.project_name}>{t.project_name}</div>
                        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                          <TypeTag type={t.type} />
                          <span className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                            {t.seconds > 0 && <span className="inline-flex items-center gap-0.5" title="Time spent"><Clock size={12} />{dur(t.seconds)}</span>}
                            {t.comments > 0 && <span className="inline-flex items-center gap-0.5" title="Comments"><MessageSquare size={12} />{t.comments}</span>}
                            {t.attachments > 0 && <span className="inline-flex items-center gap-0.5" title="Attachments"><Paperclip size={12} />{t.attachments}</span>}
                          </span>
                        </div>
                        {t.assignees.length > 0 && (
                          <div className="mt-2 flex -space-x-1.5">{t.assignees.slice(0, 5).map(a => <span key={a.id} title={a.name} className="ring-2 ring-surface rounded-full"><Avatar photo={a.photo} name={a.name} size={22} /></span>)}</div>
                        )}
                      </button>
                    ))}
                    {!list.length && <div className="text-center text-sm text-slate-400 py-6">No tickets</div>}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <Card className="p-0 overflow-hidden">
            {!data.tickets.length ? <div className="p-10 text-center text-slate-500">No tickets match these filters.</div> : (
              <Table head={['Ticket', 'Title', 'Project', 'Type', 'Priority', 'Status', 'Time', 'Raised']}>
                {data.tickets.map(t => (
                  <tr key={t.id} onClick={() => nav(`/tickets/${t.id}`)} className="hover:bg-slate-50 cursor-pointer">
                    <td className="font-semibold text-indigo-600 whitespace-nowrap">{t.ticket_no}</td>
                    <td className="max-w-[320px]"><div className="truncate text-slate-800 font-medium">{t.title}</div></td>
                    <td className="text-slate-600 whitespace-nowrap">{t.project_name}</td>
                    <td><TypeTag type={t.type} /></td>
                    <td><PriorityTag priority={t.priority} /></td>
                    <td><StatusTag status={t.status} /></td>
                    <td className="tabular-nums text-slate-600 whitespace-nowrap">{t.seconds ? dur(t.seconds) : '—'}</td>
                    <td className="text-slate-600 whitespace-nowrap">{fmtDT(t.created_at)}</td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        )}

      {raising && <RaiseTicket projects={projects} defaultProject={f.project_id} onClose={() => setRaising(false)} onSaved={t => { setRaising(false); toast.success(`Ticket ${t.ticket_no} raised.`); nav(`/tickets/${t.id}`) }} />}
    </div>
  )
}

// A running or paused timer of the signed-in user, ticking live.
function ActiveTimer({ t, onOpen }) {
  const [now, setNow] = useState(Date.now())
  const base = useRef(Date.now())
  useEffect(() => { if (t.state !== 'running') return; const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i) }, [t.state])
  const secs = t.session_seconds + (t.state === 'running' ? (now - base.current) / 1000 : 0)
  return (
    <button type="button" onClick={onOpen} className={`w-full flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition hover:shadow ${t.state === 'running' ? 'border-green-200 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
      <Timer size={18} className={t.state === 'running' ? 'text-green-700' : 'text-amber-700'} />
      <span className="text-sm text-slate-700"><b>{t.state === 'running' ? 'Timer running' : 'Timer paused'}</b> on <b className="text-indigo-600">{t.ticket_no}</b> · {t.title}</span>
      <span className="ml-auto font-mono tabular-nums font-semibold text-slate-800">{clock(secs)}</span>
    </button>
  )
}

/* ---------- Raise ticket ---------- */

const FILE_OK = /^(image\/|application\/pdf$|application\/vnd\.ms-excel$|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet$|text\/csv$)/
export const fileIcon = mime => (mime?.startsWith('image/') ? ImageIcon : mime === 'application/pdf' ? FileText : Sheet)
const size = b => (b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toFixed(1)} MB`)
const isUrl = v => { try { return ['http:', 'https:'].includes(new URL(v).protocol) } catch { return false } }

// File + link picker used when raising a ticket and on the detail page.
export function AttachPicker({ files, setFiles, links, setLinks, error }) {
  const input = useRef(null)
  const [drag, setDrag] = useState(false)
  const add = list => {
    const all = [...list]
    const bad = all.filter(x => !FILE_OK.test(x.type) || x.size > 15 * 1048576)
    if (bad.length) toast.error(`${bad.map(x => x.name).join(', ')}: only images, PDF or Excel up to 15 MB.`)
    setFiles(cur => [...cur, ...all.filter(x => !bad.includes(x) && !cur.some(c => c.name === x.name && c.size === x.size))].slice(0, 10))
  }
  return (
    <div className="space-y-2">
      <button type="button" onClick={() => input.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files) }}
        className={`w-full rounded-xl border-2 border-dashed px-4 py-4 text-center transition ${drag ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}>
        <Upload size={18} className="mx-auto text-slate-400 mb-1" />
        <div className="text-sm text-slate-700"><b className="text-indigo-600">Choose files</b> or drop them here</div>
        <div className="text-xs text-slate-400">Images, PDF or Excel · up to 10 files · 15 MB each</div>
      </button>
      <input ref={input} type="file" multiple accept="image/*,application/pdf,.xls,.xlsx,.csv" className="hidden" onChange={e => { add(e.target.files); e.target.value = '' }} />
      {files.map((x, i) => {
        const I = fileIcon(x.type)
        return (
          <div key={x.name + x.size} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm">
            <I size={15} className="text-slate-500 shrink-0" /><span className="truncate flex-1 text-slate-700">{x.name}</span>
            <span className="text-xs text-slate-400">{size(x.size)}</span>
            <button type="button" onClick={() => setFiles(c => c.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-600 p-0.5" aria-label={`Remove ${x.name}`}><X size={14} /></button>
          </div>
        )
      })}
      {links.map((l, i) => (
        <div key={i} className="flex items-center gap-2">
          <Link2 size={15} className="text-slate-400 shrink-0" />
          <input value={l} onChange={e => setLinks(c => c.map((x, j) => (j === i ? e.target.value : x)))} placeholder="https://…" aria-label={`Link ${i + 1}`}
            className={`flex-1 border rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 ${l && !isUrl(l) ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-indigo-200'}`} />
          <button type="button" onClick={() => setLinks(c => c.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-600 p-0.5" aria-label="Remove link"><X size={14} /></button>
        </div>
      ))}
      <button type="button" onClick={() => setLinks(c => [...c, ''])} className="text-sm font-medium text-indigo-600 hover:underline inline-flex items-center gap-1"><Link2 size={14} />Add a link</button>
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </div>
  )
}

// Sends a multipart form; returns JSON.
export async function sendForm(path, fd) {
  let res
  try { res = await fetch('/api' + path, { method: 'POST', credentials: 'same-origin', headers: { 'X-Requested-With': 'tracker-ui' }, body: fd }) }
  catch { throw new Error('Cannot reach the server. Check your connection and try again.') }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  return data
}

function RaiseTicket({ projects: initialProjects, defaultProject, onClose, onSaved }) {
  const [projects, setProjects] = useState(initialProjects)
  const [f, setF] = useState({ project_id: defaultProject || '', title: '', description: '', type: 'bug', priority: 'medium', reported_by: 'client', reporter_name: '', due_date: '', assignee_ids: [] })
  const [employees, setEmployees] = useState([])
  const [files, setFiles] = useState([])
  const [links, setLinks] = useState([])
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const loadOptions = () => api('/tickets/options').then(d => { setEmployees(d.employees); setProjects(d.projects) }).catch(() => {})
  useEffect(() => { loadOptions() }, [])
  const qa = useQuickAdd() // "+ Add new project / employee" inside the dropdowns
  const set = (k, v) => { setF(s => ({ ...s, [k]: v })); setErrors(e => (e[k] ? { ...e, [k]: undefined } : e)) }
  const project = projects.find(p => String(p.id) === String(f.project_id))

  const submit = async e => {
    e.preventDefault()
    const errs = {}
    if (!f.project_id) errs.project_id = 'Pick a project.'
    if (!f.title.trim()) errs.title = 'Issue title is required.'
    const ls = links.map(l => l.trim()).filter(Boolean)
    if (ls.some(l => !isUrl(l))) errs.links = 'Each link must start with https://'
    if (Object.keys(errs).length) { setErrors(errs); return }
    const fd = new FormData()
    Object.entries(f).forEach(([k, v]) => fd.append(k, k === 'assignee_ids' ? JSON.stringify(v.map(Number)) : typeof v === 'string' ? v.trim() : v))
    fd.append('links', JSON.stringify(ls))
    files.forEach(x => fd.append('files', x))
    setBusy(true)
    try { onSaved(await sendForm('/tickets', fd)) } catch (x) { setBusy(false); toast.error(x.message) }
  }

  return (
    <Modal title="Raise ticket" sub={project ? `Will be numbered ${project.prefix}-…` : 'Every change on a project gets its own ticket.'} onClose={onClose} size="max-w-2xl">
      <form onSubmit={submit} noValidate className="p-5 space-y-4">
        <Dropdown label="Project" required value={f.project_id} error={errors.project_id} onChange={v => set('project_id', v)} placeholder="Select a project"
          options={projects.map(p => ({ value: p.id, label: `${p.name} (${p.prefix})` }))}
          {...qa.props('project', async id => { await loadOptions(); set('project_id', id) })} />
        <Input label="Issue" req value={f.title} error={errors.title} onChange={e => set('title', e.target.value)} maxLength={200} placeholder="e.g. SAP data sync failure" />
        <Textarea label="Details (optional)" rows={4} value={f.description} onChange={e => set('description', e.target.value)} maxLength={5000} placeholder="Steps to reproduce, what was expected, what happened…" />
        <div className="grid sm:grid-cols-3 gap-3">
          <Dropdown label="Type" value={f.type} onChange={v => set('type', v)} options={opts(TYPES)} />
          <Dropdown label="Priority" value={f.priority} onChange={v => set('priority', v)} options={opts(PRIORITIES)} />
          <Dropdown label="Reported by" value={f.reported_by} onChange={v => set('reported_by', v)} options={opts(REPORTERS)} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Reporter name (optional)" value={f.reporter_name} onChange={e => set('reporter_name', e.target.value)} maxLength={160} placeholder="Who reported it" />
          <DatePicker label="Due date (optional)" value={f.due_date} onChange={v => set('due_date', v || '')} />
        </div>
        <MultiSelect label="Assign to (optional)" value={f.assignee_ids} onChange={v => set('assignee_ids', v)} placeholder="Select employees"
          options={employees.map(e => ({ value: e.id, label: e.role_name ? `${e.name} · ${e.role_name}` : e.name }))}
          {...qa.props('employee', async id => { await loadOptions(); setF(s => ({ ...s, assignee_ids: [...s.assignee_ids, id] })) })} />
        <div>
          <span className="block text-xs font-medium text-slate-600 mb-1">Attachments (optional)</span>
          <AttachPicker files={files} setFiles={setFiles} links={links} setLinks={setLinks} error={errors.links} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Raising…' : 'Raise ticket'}</Button>
        </div>
      </form>
      {qa.node}
    </Modal>
  )
}
