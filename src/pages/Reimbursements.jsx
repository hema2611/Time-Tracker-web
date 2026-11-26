import { useEffect, useRef, useState } from 'react'
import { Plus, X, Ban, Hourglass, CircleCheck, CircleAlert, Paperclip, FileText, Image as ImageIcon, Upload, Wallet, PauseCircle, RefreshCw } from 'lucide-react'
import { api, fmtDate } from '../lib/api.js'
import { toast } from '../lib/toast.js'
import { useAuth } from '../auth.jsx'
import { Card, Pill, Button, PageHeader, Input, Textarea, Table, Modal, ConfirmDialog, Dropdown, Avatar } from '../components/ui.jsx'

const STATUS = {
  unpaid: { label: 'Unpaid', tone: 'late', icon: CircleAlert },
  pending: { label: 'Pending', tone: 'risk', icon: Hourglass },
  hold: { label: 'On hold', tone: 'neutral', icon: PauseCircle },
  paid: { label: 'Paid', tone: 'ok', icon: CircleCheck },
  cancelled: { label: 'Cancelled', tone: 'neutral', icon: Ban },
}
const SETTABLE = ['unpaid', 'pending', 'hold', 'paid']
const MAX_FILES = 10
const MAX_MB = 10
const money = n => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const size = b => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`)
const isOk = f => /^image\//.test(f.type) || f.type === 'application/pdf'
const fileUrl = id => `/api/reimbursements/files/${id}`

export default function Reimbursements() {
  const { user } = useAuth()
  const [perms, setPerms] = useState({ view: true, create: false, edit: false })
  const [scope, setScope] = useState('mine')
  const [status, setStatus] = useState('')
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [deciding, setDeciding] = useState(null)
  const [confirming, setConfirming] = useState(null)

  useEffect(() => { api('/permissions/me').then(p => setPerms(p.modules?.reimbursements || {})).catch(() => {}) }, [])

  const loadSummary = () => api('/reimbursements/summary').then(setSummary).catch(() => {})
  const loadRows = () => {
    setLoading(true)
    const q = new URLSearchParams({ scope, ...(status && { status }) })
    return api(`/reimbursements?${q}`).then(d => setRows(d.claims)).catch(e => toast.error(e.message)).finally(() => setLoading(false))
  }
  const reload = () => { loadSummary(); loadRows() }
  useEffect(() => { loadSummary() }, [])
  useEffect(() => { loadRows() }, [scope, status])

  const cancelOwn = x => setConfirming({
    title: 'Cancel this claim?',
    message: `“${x.title}” (${money(x.amount)}) will be withdrawn.`,
    confirmLabel: 'Yes, cancel it',
    onConfirm: async () => {
      try { await api(`/reimbursements/${x.id}/cancel`, { method: 'POST' }); toast.success('Claim cancelled.'); reload() }
      catch (e) { toast.error(e.message) }
    },
  })

  const team = scope === 'team'
  const tile = (key, label, Icon, tone) => (
    <Card className="p-4 flex items-center gap-3">
      <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${tone}`}><Icon size={19} /></span>
      <div className="min-w-0">
        <div className="text-xl font-semibold tabular-nums text-slate-900 truncate">{summary ? money(summary[key].total) : '–'}</div>
        <div className="text-xs text-slate-500">{label}{summary ? ` · ${summary[key].n} claim${summary[key].n === 1 ? '' : 's'}` : ''}</div>
      </div>
    </Card>
  )

  return (
    <div>
      <PageHeader title="Reimbursements" sub="Claim back money you spent for work, such as travel to a client meeting, with the bills attached. New claims start as Unpaid."
        actions={perms.create && <Button variant="primary" onClick={() => setAdding(true)}><Plus size={16} className="inline -mt-0.5 mr-1" />New claim</Button>} />

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
        {tile('unpaid', 'Unpaid', CircleAlert, 'bg-red-100 text-red-700')}
        {tile('pending', 'Payment pending', Hourglass, 'bg-amber-100 text-amber-700')}
        {tile('hold', 'On hold', PauseCircle, 'bg-slate-100 text-slate-600')}
        {tile('paid', 'Paid', CircleCheck, 'bg-green-100 text-green-700')}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        {perms.edit && (
          <div className="inline-flex bg-surface border border-slate-200 rounded-xl p-1 shadow-sm">
            {[{ v: 'mine', label: 'My claims' }, { v: 'team', label: 'Team claims' }].map(t => (
              <button key={t.v} onClick={() => setScope(t.v)} aria-pressed={scope === t.v}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${scope === t.v ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>{t.label}</button>
            ))}
          </div>
        )}
        <Dropdown className="w-44" value={status} onChange={setStatus} placeholder="All statuses"
          options={[{ value: '', label: 'All statuses' }, ...Object.entries(STATUS).map(([v, s]) => ({ value: v, label: s.label }))]} />
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? <div className="p-8 text-center text-slate-400">Loading…</div>
          : rows.length === 0 ? (
            <div className="p-10 text-center">
              <Wallet size={28} className="mx-auto text-slate-400 mb-2" />
              <p className="text-slate-500">{team ? 'No team claims match these filters.' : 'No claims yet.'}</p>
              {!team && perms.create && <p className="text-sm text-slate-400 mt-1">Use <b>New claim</b> above.</p>}
            </div>
          ) : (
            <Table head={['Claim', ...(team ? ['Employee'] : []), 'Amount', 'Bills', 'Submitted', 'Status', '']}>
              {rows.map(x => {
                const s = STATUS[x.status]
                const others = team && (!x.mine || user?.role === 'admin')
                return (
                  <tr key={x.id} className="hover:bg-slate-50 align-top">
                    <td className="max-w-[320px]">
                      <div className="font-medium text-slate-800">{x.title}</div>
                      {x.description && <div className="text-xs text-slate-500 mt-1 line-clamp-2 whitespace-pre-line" title={x.description}>{x.description}</div>}
                    </td>
                    {team && (
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar photo={x.photo} name={x.user_name} size={30} />
                          <div className="min-w-0"><div className="font-medium text-slate-800 truncate">{x.user_name}</div><div className="text-xs text-slate-500 truncate">{x.emp_no || x.user_email}</div></div>
                        </div>
                      </td>
                    )}
                    <td className="whitespace-nowrap font-semibold tabular-nums text-slate-800">{money(x.amount)}</td>
                    <td>
                      <div className="flex flex-col gap-1">
                        {x.files.map(f => (
                          <a key={f.id} href={fileUrl(f.id)} target="_blank" rel="noopener noreferrer" title={`${f.original_name} · ${size(f.size_bytes)}`}
                            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline max-w-[200px]">
                            {f.mime_type === 'application/pdf' ? <FileText size={14} className="shrink-0" /> : <ImageIcon size={14} className="shrink-0" />}
                            <span className="truncate">{f.original_name}</span>
                          </a>
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-slate-600">{fmtDate(x.created_at)}</td>
                    <td>
                      <Pill tone={s.tone}><s.icon size={12} className="inline -mt-0.5 mr-1" />{s.label}</Pill>
                      {x.decided_by_name && x.status !== 'pending' && <div className="text-xs text-slate-500 mt-1" title={x.decision_note || undefined}>{s.label} by {x.decided_by_name}{x.decision_note ? ` · “${x.decision_note}”` : ''}</div>}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {others && x.status !== 'cancelled' && (
                        <button onClick={() => setDeciding({ x, status: 'change' })} className="text-slate-400 hover:text-indigo-600 p-1.5" title="Change status"><RefreshCw size={16} /></button>
                      )}
                      {others && !['paid', 'cancelled'].includes(x.status) && (
                        <button onClick={() => setDeciding({ x, status: 'cancelled' })} className="text-slate-400 hover:text-red-600 p-1.5" title="Cancel claim"><Ban size={16} /></button>
                      )}
                      {!team && x.status === 'unpaid' && (
                        <button onClick={() => cancelOwn(x)} className="text-slate-400 hover:text-red-600 p-1.5" title="Cancel claim"><X size={17} /></button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </Table>
          )}
      </Card>

      {adding && <ClaimForm onClose={() => setAdding(false)} onSaved={() => { setAdding(false); setScope('mine'); reload() }} />}
      {deciding && <DecisionDialog {...deciding} onClose={() => setDeciding(null)} onDone={() => { setDeciding(null); reload() }} />}
      {confirming && <ConfirmDialog {...confirming} tone="warn" onClose={() => setConfirming(null)} />}
    </div>
  )
}

/* ---------- New claim ---------- */

function ClaimForm({ onClose, onSaved }) {
  const [f, setF] = useState({ title: '', description: '', amount: '' })
  const [files, setFiles] = useState([])
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const input = useRef(null)
  const set = (k, v) => { setF(s => ({ ...s, [k]: v })); setErrors(e => (e[k] ? { ...e, [k]: undefined } : e)) }

  const addFiles = list => {
    const picked = [...list]
    const bad = picked.filter(x => !isOk(x))
    const big = picked.filter(x => isOk(x) && x.size > MAX_MB * 1024 * 1024)
    if (bad.length) toast.error(`${bad.map(x => x.name).join(', ')}: only images and PDFs can be attached.`)
    if (big.length) toast.error(`${big.map(x => x.name).join(', ')}: each file must be ${MAX_MB} MB or smaller.`)
    const good = picked.filter(x => isOk(x) && x.size <= MAX_MB * 1024 * 1024)
    setFiles(cur => {
      const next = [...cur, ...good.filter(g => !cur.some(c => c.name === g.name && c.size === g.size))]
      if (next.length > MAX_FILES) toast.error(`You can attach up to ${MAX_FILES} files.`)
      return next.slice(0, MAX_FILES)
    })
    setErrors(e => ({ ...e, files: undefined }))
  }

  const submit = async e => {
    e.preventDefault()
    const errs = {}
    if (!f.title.trim()) errs.title = 'Title is required.'
    const amt = f.amount.trim()
    if (!amt) errs.amount = 'Enter the amount.'
    else if (!/^\d+(\.\d{1,2})?$/.test(amt)) errs.amount = 'Enter a number, with at most 2 decimal places.'
    else if (Number(amt) <= 0) errs.amount = 'Amount must be more than 0.'
    if (!files.length) errs.files = 'Attach at least one bill (image or PDF).'
    if (Object.keys(errs).length) { setErrors(errs); return }

    const body = new FormData()
    body.append('title', f.title.trim())
    if (f.description.trim()) body.append('description', f.description.trim())
    body.append('amount', amt)
    files.forEach(x => body.append('files', x))
    setBusy(true)
    try {
      const res = await fetch('/api/reimbursements', { method: 'POST', credentials: 'same-origin', headers: { 'X-Requested-With': 'tracker-ui' }, body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not submit the claim. Please try again.')
      toast.success(`Claim for ${money(amt)} submitted.`)
      onSaved()
    } catch (x) { setBusy(false); toast.error(x.message === 'Failed to fetch' ? 'Cannot reach the server. Check your connection and try again.' : x.message) }
  }

  return (
    <Modal title="New claim" sub="What you spent, and the bills to back it up." onClose={onClose} size="max-w-lg">
      <form onSubmit={submit} noValidate className="p-5 space-y-4">
        <Input label="Title" req value={f.title} error={errors.title} onChange={e => set('title', e.target.value)} maxLength={160} placeholder="e.g. Client meeting" />
        <Textarea label="Description (optional)" rows={3} value={f.description} onChange={e => set('description', e.target.value)} maxLength={2000}
          placeholder="e.g. Went to the client's office in Guindy. Auto both ways and lunch." />
        <Input label="Amount (₹)" req inputMode="decimal" value={f.amount} error={errors.amount} onChange={e => set('amount', e.target.value.replace(/[^\d.]/g, ''))} placeholder="0.00" />

        <div>
          <span className="block text-xs font-medium text-slate-600 mb-1">Attachments<span className="text-red-500"> *</span></span>
          <button type="button" onClick={() => input.current?.click()}
            onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files) }}
            className={`w-full rounded-xl border-2 border-dashed px-4 py-5 text-center transition ${drag ? 'border-indigo-500 bg-indigo-50' : errors.files ? 'border-red-300' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}>
            <Upload size={20} className="mx-auto text-slate-400 mb-1.5" />
            <div className="text-sm text-slate-700"><b className="text-indigo-600">Choose files</b> or drop them here</div>
            <div className="text-xs text-slate-400 mt-0.5">Images or PDF · up to {MAX_FILES} files · {MAX_MB} MB each</div>
          </button>
          <input ref={input} type="file" multiple accept="image/*,application/pdf" className="hidden"
            onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
          {errors.files && <span className="block text-xs text-red-600 mt-1">{errors.files}</span>}
          {files.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {files.map((x, i) => (
                <li key={x.name + x.size} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm">
                  {x.type === 'application/pdf' ? <FileText size={15} className="text-slate-500 shrink-0" /> : <ImageIcon size={15} className="text-slate-500 shrink-0" />}
                  <span className="truncate flex-1 text-slate-700">{x.name}</span>
                  <span className="text-xs text-slate-400 shrink-0">{size(x.size)}</span>
                  <button type="button" onClick={() => setFiles(cur => cur.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-600 p-0.5" aria-label={`Remove ${x.name}`}><X size={14} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}><Paperclip size={15} className="inline -mt-0.5 mr-1" />{busy ? 'Submitting…' : 'Submit claim'}</Button>
        </div>
      </form>
    </Modal>
  )
}

/* ---------- Payment status / cancel ---------- */

function DecisionDialog({ x, status, onClose, onDone }) {
  const cancelling = status === 'cancelled'
  const [pick, setPick] = useState(x.status === 'unpaid' ? 'paid' : x.status)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const go = async () => {
    setBusy(true)
    try {
      const body = { note: note.trim() || undefined }
      if (cancelling) await api(`/reimbursements/${x.id}/cancel`, { method: 'POST', body })
      else await api(`/reimbursements/${x.id}/status`, { method: 'POST', body: { status: pick, ...body } })
      toast.success(cancelling ? `${x.user_name}'s claim cancelled.` : `${x.user_name}'s claim marked ${STATUS[pick].label.toLowerCase()}.`)
      onDone()
    } catch (e) { setBusy(false); toast.error(e.message) }
  }
  return (
    <Modal title={cancelling ? 'Cancel claim?' : 'Change payment status'} sub={`${x.user_name} · ${x.title} · now ${STATUS[x.status].label.toLowerCase()}`} onClose={onClose} size="max-w-md">
      <div className="p-5 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
          <b className="text-slate-800 text-base">{money(x.amount)}</b> · {x.files.length} bill{x.files.length === 1 ? '' : 's'}
          {x.description && <p className="mt-1 text-slate-500 whitespace-pre-line">{x.description}</p>}
        </div>
        {!cancelling && (
          <div>
            <span className="block text-xs font-medium text-slate-600 mb-1.5">Status</span>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Payment status">
              {SETTABLE.map(k => {
                const S = STATUS[k], on = pick === k
                return (
                  <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setPick(k)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${on ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <S.icon size={15} />{S.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <Textarea label={`Note to ${x.user_name.split(' ')[0]} (optional)`} rows={2} value={note} onChange={e => setNote(e.target.value)} maxLength={255}
          placeholder={cancelling ? 'e.g. Duplicate claim' : pick === 'hold' ? 'e.g. Bill is not readable, please resend' : pick === 'paid' ? 'e.g. Paid with this month’s salary' : 'e.g. Will be paid this week'} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Keep as is</Button>
          <Button type="button" variant={cancelling ? 'danger' : 'primary'} onClick={go} disabled={busy || (!cancelling && pick === x.status)}>
            {busy ? 'Saving…' : cancelling ? 'Cancel claim' : `Mark as ${STATUS[pick].label.toLowerCase()}`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
