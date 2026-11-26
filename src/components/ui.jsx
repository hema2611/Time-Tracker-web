import { useState, useRef, useEffect } from 'react'
import { Trash2, AlertTriangle, ChevronDown, Check, Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Search, Clock, User } from 'lucide-react'

// Employee photo, or a placeholder icon when there is none.
export const photoUrl = p => (p ? `/api/uploads/${p}` : null)
export function Avatar({ photo, name, size = 36 }) {
  const url = photoUrl(photo)
  return url
    ? <img src={url} alt={name} width={size} height={size} className="rounded-full object-cover border border-slate-200 shrink-0" style={{ width: size, height: size }} />
    : <div className="rounded-full bg-indigo-50 text-indigo-600 grid place-items-center border border-slate-200 shrink-0" style={{ width: size, height: size }}><User size={size * 0.5} /></div>
}

// Closes a popup when clicking outside `ref` or pressing Escape.
function useDismiss(open, ref, close) {
  useEffect(() => {
    if (!open) return
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) close() }
    const onKey = e => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])
}

// Multi-select with search, checkboxes and removable chips. value = array of option values.
export function MultiSelect({ label, value = [], onChange, options, placeholder = 'Select…', req, error, hint, className = '' }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef(null)
  useDismiss(open, ref, () => setOpen(false))
  const has = v => value.some(x => String(x) === String(v))
  const toggle = v => onChange(has(v) ? value.filter(x => String(x) !== String(v)) : [...value, v])
  const shown = options.filter(o => o.label.toLowerCase().includes(q.trim().toLowerCase()))
  const selected = options.filter(o => has(o.value))
  const allShownSelected = shown.length > 0 && shown.every(o => has(o.value))
  const toggleAll = () => {
    const ids = shown.map(o => o.value)
    onChange(allShownSelected ? value.filter(x => !ids.some(i => String(i) === String(x))) : [...value, ...ids.filter(i => !has(i))])
  }

  return (
    <div className={`block ${className}`}>
      {label && <span className="block text-xs font-medium text-slate-600 mb-1">{label}{req && <span className="text-red-500"> *</span>}</span>}
      <div className="relative" ref={ref}>
        <button type="button" onClick={() => setOpen(o => !o)}
          className={`w-full flex items-center justify-between gap-2 border rounded-xl px-3 py-2 bg-white text-left focus:outline-none focus:ring-2 ${error ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-indigo-200'}`}>
          <span className={selected.length ? 'text-slate-800' : 'text-slate-400'}>{selected.length ? `${selected.length} selected` : placeholder}</span>
          <ChevronDown size={16} className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-[0_12px_30px_-10px_rgba(15,23,42,0.35)]">
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search…"
                  className="w-full border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
              </div>
              {shown.length > 0 && (
                <button type="button" onClick={toggleAll} className="mt-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700">
                  {allShownSelected ? 'Clear all' : 'Select all'}{q ? ' (filtered)' : ''}
                </button>
              )}
            </div>
            <ul className="max-h-56 overflow-y-auto py-1">
              {shown.length === 0 && <li className="px-3 py-3 text-sm text-slate-400 text-center">No matches</li>}
              {shown.map(o => {
                const on = has(o.value)
                return (
                  <li key={String(o.value)}>
                    <button type="button" onClick={() => toggle(o.value)}
                      className={`w-full flex items-center gap-2.5 text-left px-3 py-2 text-sm ${on ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`}>
                      <span className={`w-4 h-4 shrink-0 rounded border grid place-items-center ${on ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                        {on && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span className="truncate">{o.label}</span>
                      {o.sub && <span className="ml-auto text-xs text-slate-400 truncate">{o.sub}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map(o => (
            <span key={String(o.value)} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full pl-2.5 pr-1 py-0.5">
              {o.label}
              <button type="button" onClick={() => toggle(o.value)} className="rounded-full hover:bg-indigo-100 p-0.5" aria-label={`Remove ${o.label}`}><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
      {error ? <span className="block text-xs text-red-600 mt-1">{error}</span> : hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
    </div>
  )
}

// Time picker: 15-minute slots in a scrollable list. value = 'HH:MM' (24h).
const TIME_SLOTS = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4), m = (i % 4) * 15
  const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  const label = `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
  return { value, label }
})
export const fmtTime = v => TIME_SLOTS.find(t => t.value === v)?.label || v || ''

export function TimeSelect({ label, value, onChange, req, error, hint, placeholder = 'Select time', className = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const listRef = useRef(null)
  useDismiss(open, ref, () => setOpen(false))
  // Scroll the current (or 9 AM) slot into view when opening.
  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current.querySelector(`[data-v="${value || '09:00'}"]`)
    if (el) listRef.current.scrollTop = el.offsetTop - 80
  }, [open])

  return (
    <div className={`block ${className}`}>
      {label && <span className="block text-xs font-medium text-slate-600 mb-1">{label}{req && <span className="text-red-500"> *</span>}</span>}
      <div className="relative" ref={ref}>
        <button type="button" onClick={() => setOpen(o => !o)}
          className={`w-full flex items-center justify-between gap-2 border rounded-xl px-3 py-2 bg-white text-left focus:outline-none focus:ring-2 ${error ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-indigo-200'}`}>
          <span className={value ? 'text-slate-800' : 'text-slate-400'}>{value ? fmtTime(value) : placeholder}</span>
          <Clock size={16} className="shrink-0 text-slate-400" />
        </button>
        {open && (
          <ul ref={listRef} className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-[0_12px_30px_-10px_rgba(15,23,42,0.35)] max-h-56 overflow-y-auto py-1">
            {TIME_SLOTS.map(t => (
              <li key={t.value} data-v={t.value}>
                <button type="button" onClick={() => { onChange(t.value); setOpen(false) }}
                  className={`w-full text-left px-3 py-2 text-sm ${t.value === value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}>{t.label}</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error ? <span className="block text-xs text-red-600 mt-1">{error}</span> : hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
    </div>
  )
}

// Custom dropdown with a height-capped, scrollable option panel.
// options: [{ value, label }]. Pass an empty-value option for a "clear" choice.
export function Dropdown({ label, value, onChange, options, placeholder = 'Select…', required, error, hint, className = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const selected = options.find(o => String(o.value) === String(value ?? ''))
  const show = selected && selected.value !== '' ? selected.label : null

  return (
    <div className={`block ${className}`}>
      {label && <span className="block text-xs font-medium text-slate-600 mb-1">{label}{required && <span className="text-red-500"> *</span>}</span>}
      <div className="relative" ref={ref}>
        <button type="button" onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open}
          className={`w-full flex items-center justify-between gap-2 border rounded-xl px-3 py-2 bg-white text-left focus:outline-none focus:ring-2 ${error ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-indigo-200'}`}>
          <span className={show ? 'text-slate-800 truncate' : 'text-slate-400 truncate'}>{show || placeholder}</span>
          <ChevronDown size={16} className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <ul role="listbox" className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-[0_12px_30px_-10px_rgba(15,23,42,0.35)] max-h-56 overflow-y-auto py-1">
            {options.map(o => {
              const active = String(o.value) === String(value ?? '')
              return (
                <li key={String(o.value)}>
                  <button type="button" onClick={() => { onChange(o.value); setOpen(false) }}
                    className={`w-full flex items-center justify-between gap-2 text-left px-3 py-2 text-sm ${active ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}>
                    <span className="truncate">{o.label}</span>
                    {active && o.value !== '' && <Check size={15} className="shrink-0" />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      {error ? <span className="block text-xs text-red-600 mt-1">{error}</span> : hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
    </div>
  )
}

// Calendar date picker. Opens on clicking anywhere in the field; value is 'YYYY-MM-DD'.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WD = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const pad = n => String(n).padStart(2, '0')
const toISO = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`

export function DatePicker({ label, value, onChange, req, error, hint, placeholder = 'Select date', className = '', minYear = 1950, maxYear = new Date().getFullYear() + 5 }) {
  const [open, setOpen] = useState(false)
  const parsed = value ? new Date(value + 'T00:00:00') : null
  const [view, setView] = useState(() => parsed || new Date())
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const y = view.getFullYear(), m = view.getMonth()
  const firstDay = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const cells = [...Array(firstDay).fill(null), ...Array(daysInMonth).fill(0).map((_, i) => i + 1)]
  const years = []
  for (let yr = maxYear; yr >= minYear; yr--) years.push(yr)
  const display = parsed ? parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null
  const shift = n => setView(new Date(y, m + n, 1))

  return (
    <div className={`block ${className}`}>
      {label && <span className="block text-xs font-medium text-slate-600 mb-1">{label}{req && <span className="text-red-500"> *</span>}</span>}
      <div className="relative" ref={ref}>
        <button type="button" onClick={() => setOpen(o => !o)}
          className={`w-full flex items-center justify-between gap-2 border rounded-xl px-3 py-2 bg-white text-left focus:outline-none focus:ring-2 ${error ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-indigo-200'}`}>
          <span className={display ? 'text-slate-800' : 'text-slate-400'}>{display || placeholder}</span>
          <CalendarIcon size={16} className="shrink-0 text-slate-400" />
        </button>
        {open && (
          <div className="absolute z-50 mt-1 w-[16rem] bg-white border border-slate-200 rounded-xl shadow-[0_12px_30px_-10px_rgba(15,23,42,0.35)] p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <button type="button" onClick={() => shift(-1)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"><ChevronLeft size={16} /></button>
              <select value={m} onChange={e => setView(new Date(y, +e.target.value, 1))} className="flex-1 text-sm border border-slate-200 rounded-lg px-1.5 py-1 bg-white">
                {MONTHS.map((mn, i) => <option key={mn} value={i}>{mn}</option>)}
              </select>
              <select value={y} onChange={e => setView(new Date(+e.target.value, m, 1))} className="text-sm border border-slate-200 rounded-lg px-1.5 py-1 bg-white max-h-40">
                {years.map(yr => <option key={yr} value={yr}>{yr}</option>)}
              </select>
              <button type="button" onClick={() => shift(1)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"><ChevronRight size={16} /></button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {WD.map(d => <div key={d} className="text-[10px] font-medium text-slate-400 py-1">{d}</div>)}
              {cells.map((d, i) => d === null ? <div key={`b${i}`} /> : (() => {
                const iso = toISO(y, m, d)
                const sel = iso === value
                return (
                  <button type="button" key={iso} onClick={() => { onChange(iso); setOpen(false) }}
                    className={`h-8 rounded-lg text-sm ${sel ? 'bg-indigo-600 text-white font-medium' : 'text-slate-700 hover:bg-indigo-50'}`}>{d}</button>
                )
              })())}
            </div>
          </div>
        )}
      </div>
      {error ? <span className="block text-xs text-red-600 mt-1">{error}</span> : hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
    </div>
  )
}

export const Card = ({ className = '', children }) => (
  <div className={`glass border border-slate-200 rounded-2xl shadow-[0_10px_30px_-20px_rgb(15_23_42/0.4)] ${className}`}>{children}</div>
)

// A centred dialog used by both masters for create / edit.
export const Modal = ({ title, sub, onClose, children, size = 'max-w-lg' }) => (
  <div className="fixed inset-0 z-50 grid place-items-start md:place-items-center overflow-y-auto bg-slate-900/40 p-3 md:p-6" onMouseDown={onClose}>
    <div className={`glass border border-slate-200 rounded-2xl shadow-2xl w-full ${size} rise mt-6 md:mt-0`} onMouseDown={e => e.stopPropagation()}>
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
        </div>
        <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700 text-xl leading-none px-1">×</button>
      </div>
      {children}
    </div>
  </div>
)

const PILL = {
  ok: 'bg-green-100 text-green-700', risk: 'bg-amber-100 text-amber-700', late: 'bg-red-100 text-red-700',
  done: 'bg-slate-100 text-slate-600', info: 'bg-indigo-50 text-indigo-700', neutral: 'bg-slate-100 text-slate-600',
}
export const Pill = ({ tone = 'neutral', children }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${PILL[tone]}`}>{children}</span>
)

export const Button = ({ variant = 'default', className = '', ...p }) => {
  const v = {
    default: 'bg-slate-100 border-slate-200 hover:border-slate-300 hover:bg-slate-200 text-slate-700',
    primary: 'rail border-transparent text-ink hover:brightness-110 shadow-[0_0_26px_-8px_#5ee6ff]',
    success: 'bg-green-600 border-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 border-red-600 hover:bg-red-700 text-white',
    ghost: 'border-transparent hover:bg-slate-100 text-slate-600',
  }[variant]
  return <button className={`border rounded-xl px-3.5 py-1.5 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${v} ${className}`} {...p} />
}

// A styled confirmation dialog — replaces the browser's native confirm().
// Usage: keep state `const [confirm, setConfirm] = useState(null)` and render
// {confirm && <ConfirmDialog {...confirm} onClose={() => setConfirm(null)} />}
export const ConfirmDialog = ({ title = 'Are you sure?', message, confirmLabel = 'Delete', tone = 'danger', onConfirm, onClose }) => {
  const [busy, setBusy] = useState(false)
  const go = async () => { setBusy(true); try { await onConfirm() } finally { setBusy(false); onClose() } }
  const Icon = tone === 'danger' ? Trash2 : AlertTriangle
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-900/40 p-4" onMouseDown={onClose}>
      <div className="glass border border-slate-200 rounded-2xl shadow-2xl w-full max-w-sm rise p-6 text-center" onMouseDown={e => e.stopPropagation()}>
        <div className={`w-12 h-12 mx-auto rounded-full grid place-items-center ${tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
          <Icon size={22} />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mt-4">{title}</h2>
        {message && <p className="text-sm text-slate-500 mt-1.5">{message}</p>}
        <div className="flex gap-2.5 mt-6">
          <Button variant="default" className="flex-1 justify-center" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} className="flex-1 justify-center" onClick={go} disabled={busy}>{busy ? 'Working…' : confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}

export const PageHeader = ({ title, sub, actions }) => (
  <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      {sub && <p className="text-slate-500 mt-0.5">{sub}</p>}
    </div>
    {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
  </div>
)

export const Textarea = ({ label, hint, error, req, className = '', ...p }) => (
  <label className={`block ${className}`}>
    {label && <span className="block text-xs font-medium text-slate-600 mb-1">{label}{req && <span className="text-red-500"> *</span>}</span>}
    <textarea rows={3} className={`w-full border rounded-xl px-3 py-2 resize-y focus:outline-none focus:ring-2 ${error ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-indigo-200'}`} {...p} />
    {error ? <span className="block text-xs text-red-600 mt-1">{error}</span> : hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
  </label>
)

export const Input = ({ label, hint, error, req, className = '', ...p }) => (
  <label className={`block ${className}`}>
    {label && <span className="block text-xs font-medium text-slate-600 mb-1">{label}{req && <span className="text-red-500"> *</span>}</span>}
    <input className={`w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 ${error ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-indigo-200'}`} {...p} />
    {error ? <span className="block text-xs text-red-600 mt-1">{error}</span> : hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
  </label>
)

export const Select = ({ label, options, className = '', ...p }) => (
  <label className={`block ${className}`}>
    {label && <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>}
    <select className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white" {...p}>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  </label>
)

export const Bar = ({ value, tone = 'bg-indigo-500' }) => (
  <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${tone}`} style={{ width: `${Math.min(value, 100)}%` }} /></div>
)

export const Table = ({ head, children }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead><tr>{head.map(h => <th key={h} className="text-left text-xs font-medium text-slate-500 px-3 py-2 border-b border-slate-200 whitespace-nowrap">{h}</th>)}</tr></thead>
      <tbody className="[&_td]:px-3 [&_td]:py-2.5 [&_td]:border-b [&_td]:border-slate-100">{children}</tbody>
    </table>
  </div>
)

export const Kpi = ({ label, value, note, tone }) => (
  <Card className="p-4">
    <div className="text-xs text-slate-500">{label}</div>
    <div className="text-2xl font-semibold mt-1">{value}</div>
    {note && <div className={`text-xs mt-1 ${tone === 'bad' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : 'text-slate-400'}`}>{note}</div>}
  </Card>
)
