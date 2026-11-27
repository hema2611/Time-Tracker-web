import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Trash2, AlertTriangle, ChevronDown, Check, Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Search, Clock, User, Inbox, Plus } from 'lucide-react'

// Shared building blocks. Look and rules: DESIGN.md (read before changing). Colours only from theme tokens.

// Employee photo, or a placeholder icon when there is none.
export const photoUrl = p => (p ? `/api/uploads/${p}` : null)
export function Avatar({ photo, name, size = 36 }) {
  const url = photoUrl(photo)
  const ini = (name || '').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return url
    ? <img src={url} alt={name} width={size} height={size} className="rounded-full object-cover border border-line shrink-0" style={{ width: size, height: size }} />
    : <div className="rounded-full bg-violet-tint text-violet-strong grid place-items-center shrink-0 font-semibold" style={{ width: size, height: size, fontSize: Math.round(size * 0.35) }} aria-hidden="true">{ini || <User size={size * 0.5} strokeWidth={1.5} />}</div>
}

// Closes a popup when the user clicks, taps or tabs to anything outside `ref`, or presses Escape.
// `ref` may be one ref or an array (e.g. the field plus a panel rendered in a portal).
// Listeners use the capture phase: Modal stops mousedown from bubbling, so a bubbling
// listener on document never hears clicks inside a dialog and the popup would stay open.
export function useDismiss(open, ref, close) {
  const closeRef = useRef(close)
  closeRef.current = close
  useEffect(() => {
    if (!open) return
    const refs = Array.isArray(ref) ? ref : [ref]
    const outside = e => { if (!refs.some(r => r.current && r.current.contains(e.target))) closeRef.current() }
    const onKey = e => { if (e.key === 'Escape') closeRef.current() }
    document.addEventListener('mousedown', outside, true)
    document.addEventListener('touchstart', outside, true)
    document.addEventListener('focusin', outside, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', outside, true)
      document.removeEventListener('touchstart', outside, true)
      document.removeEventListener('focusin', outside, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])
}

// Multi-select with search, checkboxes and removable chips. value = array of option values.
export function MultiSelect({ label, value = [], onChange, options, placeholder = 'Select…', req, error, hint, className = '', onAddNew, addLabel }) {
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
          className={`w-full flex items-center justify-between gap-2 border rounded-xl px-3 py-2 bg-surface text-left focus:outline-none focus:ring-2 ${error ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-indigo-200'}`}>
          <span className={selected.length ? 'text-slate-800' : 'text-slate-400'}>{selected.length ? `${selected.length} selected` : placeholder}</span>
          <ChevronDown size={16} className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute z-50 mt-1 w-full bg-surface border border-slate-200 rounded-xl shadow-pop">
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
                      <span className={`w-4 h-4 shrink-0 rounded border grid place-items-center ${on ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-surface'}`}>
                        {on && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span className="truncate">{o.label}</span>
                      {o.sub && <span className="ml-auto text-xs text-slate-400 truncate">{o.sub}</span>}
                    </button>
                  </li>
                )
              })}
              {onAddNew && <AddNewRow label={addLabel} onClick={() => { setOpen(false); onAddNew() }} />}
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

// Time picker with a clock face and AM/PM. value = 'HH:MM' (24h); shown as 12-hour.
const p2 = n => String(n).padStart(2, '0')
const parseTime = v => {
  if (!v) return null
  const [h, m] = v.split(':').map(Number)
  return { h12: h % 12 === 0 ? 12 : h % 12, m, pm: h >= 12 }
}
const toTime = ({ h12, m, pm }) => `${p2((h12 % 12) + (pm ? 12 : 0))}:${p2(m)}`
export const fmtTime = v => { const t = parseTime(v); return t ? `${t.h12}:${p2(t.m)} ${t.pm ? 'PM' : 'AM'}` : '' }

const DIAL = 232, RADIUS = 88, CENTER = DIAL / 2
const DEFAULT_TIME = { h12: 9, m: 0, pm: false }

// `min` ('HH:MM', optional): earlier times are greyed out and cannot be picked (e.g. "from now" for today).
export function TimeSelect({ label, value, onChange, req, error, hint, placeholder = 'Select time', className = '', min }) {
  const minMin = min ? (([h, mm]) => h * 60 + mm)(min.split(':').map(Number)) : -1
  const asMin = t => ((t.h12 % 12) + (t.pm ? 12 : 0)) * 60 + t.m
  // Keep a pick inside the allowed range: if only the minutes are too early, move to the first allowed minute of that hour.
  const fit = t => {
    if (asMin(t) >= minMin) return t
    const hourStart = ((t.h12 % 12) + (t.pm ? 12 : 0)) * 60
    const need = Math.ceil((minMin - hourStart) / 5) * 5
    return need <= 55 ? { ...t, m: need } : null
  }
  const firstAllowed = () => {
    const m = Math.ceil(minMin / 5) * 5
    if (m >= 24 * 60) return DEFAULT_TIME
    const h = Math.floor(m / 60)
    return { h12: h % 12 === 0 ? 12 : h % 12, m: m % 60, pm: h >= 12 }
  }
  const initial = () => parseTime(value) || (min ? firstAllowed() : DEFAULT_TIME)

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('hour') // 'hour' → 'minute'
  const [draft, setDraft] = useState(initial)
  const [pos, setPos] = useState(null)
  const anchorRef = useRef(null)
  const panelRef = useRef(null)
  const dragging = useRef(false)
  const close = () => { setOpen(false); setPos(null) }
  useDismiss(open, [anchorRef, panelRef], close)

  useEffect(() => { if (open) { setDraft(initial()); setMode('hour') } }, [open])

  // The panel floats in a portal so a dialog can't clip it: below the field, or above when there's no room.
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const a = anchorRef.current?.getBoundingClientRect()
      const p = panelRef.current
      if (!a || !p) return
      const h = p.offsetHeight, w = p.offsetWidth, gap = 6
      const below = window.innerHeight - a.bottom, above = a.top
      const top = below >= h + gap || below >= above ? a.bottom + gap : a.top - h - gap
      setPos({ top: Math.max(8, Math.min(top, window.innerHeight - h - 8)), left: Math.min(Math.max(8, a.left), window.innerWidth - w - 8) })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [open])

  // Every change is saved straight away, so closing the panel never loses a pick. Times before `min` are ignored.
  const commit = next => {
    const ok = fit(next)
    if (!ok) return
    setDraft(ok)
    onChange(toTime(ok))
  }
  const hourBlocked = (h12, pm) => ((h12 % 12) + (pm ? 12 : 0)) * 60 + 55 < minMin
  const minuteBlocked = m5 => asMin({ ...draft, m: m5 }) < minMin
  const amBlocked = 11 * 60 + 55 < minMin

  const pickAt = e => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2
    let deg = (Math.atan2(y, x) * 180) / Math.PI + 90
    if (deg < 0) deg += 360
    const idx = Math.round(deg / 30) % 12
    if (mode === 'hour') commit({ ...draft, h12: idx === 0 ? 12 : idx })
    else commit({ ...draft, m: idx * 5 })
  }
  const onKey = e => {
    const step = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key]
    if (step) {
      e.preventDefault()
      if (mode === 'hour') commit({ ...draft, h12: ((draft.h12 - 1 + step + 12) % 12) + 1 })
      else commit({ ...draft, m: (draft.m + step * 5 + 60) % 60 })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (mode === 'hour') setMode('minute'); else close()
    }
  }

  const handDeg = mode === 'hour' ? (draft.h12 % 12) * 30 : draft.m * 6
  const rad = ((handDeg - 90) * Math.PI) / 180
  const knob = { x: CENTER + RADIUS * Math.cos(rad), y: CENTER + RADIUS * Math.sin(rad) }
  const active = mode === 'hour' ? draft.h12 % 12 : draft.m % 5 === 0 ? draft.m / 5 : -1
  const seg = on => `px-2 rounded-lg transition ${on ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'}`
  const ampm = on => `px-2.5 py-1 transition ${on ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`

  return (
    <div className={`block ${className}`}>
      {label && <span className="block text-xs font-medium text-slate-600 mb-1">{label}{req && <span className="text-red-500"> *</span>}</span>}
      <div ref={anchorRef}>
        <button type="button" onClick={() => (open ? close() : setOpen(true))} aria-haspopup="dialog" aria-expanded={open}
          className={`w-full flex items-center justify-between gap-2 border rounded-xl px-3 py-2 bg-surface text-left focus:outline-none focus:ring-2 ${error ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-indigo-200'}`}>
          <span className={value ? 'text-slate-800' : 'text-slate-400'}>{value ? fmtTime(value) : placeholder}</span>
          <Clock size={16} className="shrink-0 text-slate-400" />
        </button>
      </div>

      {open && createPortal(
        <div ref={panelRef} role="dialog" aria-label={label ? `Choose ${label.toLowerCase()}` : 'Choose time'}
          style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: 'hidden' }}
          className="fixed z-[95] w-72 bg-surface border border-slate-200 rounded-2xl shadow-pop p-4 rise">
          {/* Read-out: HH : MM  AM/PM */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center text-4xl font-semibold tabular-nums">
              <button type="button" onClick={() => setMode('hour')} className={seg(mode === 'hour')} aria-label="Edit hour">{p2(draft.h12)}</button>
              <span className="text-slate-400 px-0.5">:</span>
              <button type="button" onClick={() => setMode('minute')} className={seg(mode === 'minute')} aria-label="Edit minutes">{p2(draft.m)}</button>
            </div>
            <div className="flex flex-col rounded-lg border border-slate-200 overflow-hidden text-sm font-semibold" role="group" aria-label="AM or PM">
              <button type="button" onClick={() => commit({ ...draft, pm: false })} aria-pressed={!draft.pm} disabled={amBlocked}
                title={amBlocked ? 'Morning has already passed' : undefined} className={`${ampm(!draft.pm)} disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent`}>AM</button>
              <button type="button" onClick={() => commit({ ...draft, pm: true })} aria-pressed={draft.pm} className={`border-t border-slate-200 ${ampm(draft.pm)}`}>PM</button>
            </div>
          </div>
          <p className="text-center text-xs text-slate-500 mt-2 mb-2">
            {mode === 'hour' ? 'Select the hour' : 'Select minutes'}{min ? ` · from ${fmtTime(min)}` : ''}
          </p>

          {/* Clock face: click or drag */}
          <div tabIndex={0} role="slider" aria-label={mode === 'hour' ? 'Hour' : 'Minutes'}
            aria-valuemin={mode === 'hour' ? 1 : 0} aria-valuemax={mode === 'hour' ? 12 : 55} aria-valuenow={mode === 'hour' ? draft.h12 : draft.m}
            aria-valuetext={fmtTime(toTime(draft))}
            onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); dragging.current = true; pickAt(e) }}
            onPointerMove={e => { if (dragging.current) pickAt(e) }}
            onPointerUp={() => { dragging.current = false; if (mode === 'hour') setMode('minute') }}
            onKeyDown={onKey}
            className="mx-auto rounded-full touch-none select-none cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-300 outline-none"
            style={{ width: DIAL, height: DIAL }}>
            <svg width={DIAL} height={DIAL} aria-hidden="true">
              <circle cx={CENTER} cy={CENTER} r={CENTER} className="fill-slate-100" />
              <line x1={CENTER} y1={CENTER} x2={knob.x} y2={knob.y} strokeWidth="2" className="stroke-indigo-600" />
              <circle cx={CENTER} cy={CENTER} r="4" className="fill-indigo-600" />
              <circle cx={knob.x} cy={knob.y} r="18" className="fill-indigo-600" />
              {Array.from({ length: 12 }, (_, i) => {
                const a = ((i * 30 - 90) * Math.PI) / 180
                const on = i === active
                const off = mode === 'hour' ? hourBlocked(i === 0 ? 12 : i, draft.pm) : minuteBlocked(i * 5)
                return (
                  <text key={i} x={CENTER + RADIUS * Math.cos(a)} y={CENTER + RADIUS * Math.sin(a)} textAnchor="middle" dominantBaseline="central"
                    className={`text-sm tabular-nums ${on ? 'fill-white font-semibold' : off ? 'fill-slate-300' : 'fill-slate-700'}`}>
                    {mode === 'hour' ? (i === 0 ? 12 : i) : p2(i * 5)}
                  </text>
                )
              })}
            </svg>
          </div>

          <div className="flex items-center justify-between mt-3">
            <button type="button" onClick={() => { onChange(''); close() }} className="text-sm font-medium text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100">Clear</button>
            <Button type="button" variant="primary" onClick={() => { commit(draft); close() }}>Done</Button>
          </div>
        </div>,
        document.body,
      )}
      {error ? <span className="block text-xs text-red-600 mt-1">{error}</span> : hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
    </div>
  )
}

// Custom dropdown with a height-capped, scrollable option panel.
// options: [{ value, label }]. Pass an empty-value option for a "clear" choice.
// "+ Add new …" pinned at the bottom of a dropdown list: create a master record without leaving the form.
function AddNewRow({ label = 'Add new', onClick }) {
  return (
    <li className="sticky bottom-0 bg-surface border-t border-line mt-1">
      <button type="button" onClick={onClick}
        className="w-full flex items-center gap-2 text-left px-3 py-2.5 text-sm font-medium text-violet hover:bg-violet-tint transition duration-150">
        <Plus size={15} strokeWidth={2} className="shrink-0" />{label}
      </button>
    </li>
  )
}

// onAddNew (optional): shows "+ {addLabel}" at the bottom of the list; called after the list closes.
export function Dropdown({ label, value, onChange, options, placeholder = 'Select…', required, error, hint, className = '', onAddNew, addLabel }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useDismiss(open, ref, () => setOpen(false))

  const selected = options.find(o => String(o.value) === String(value ?? ''))
  const show = selected && selected.value !== '' ? selected.label : null

  return (
    <div className={`block ${className}`}>
      {label && <span className="block text-xs font-medium text-slate-600 mb-1">{label}{required && <span className="text-red-500"> *</span>}</span>}
      <div className="relative" ref={ref}>
        <button type="button" onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open}
          className={`w-full flex items-center justify-between gap-2 border rounded-xl px-3 py-2 bg-surface text-left focus:outline-none focus:ring-2 ${error ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-indigo-200'}`}>
          <span className={show ? 'text-slate-800 truncate' : 'text-slate-400 truncate'}>{show || placeholder}</span>
          <ChevronDown size={16} className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <ul role="listbox" className="absolute z-50 mt-1 w-full bg-surface border border-slate-200 rounded-xl shadow-pop max-h-56 overflow-y-auto py-1">
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
            {onAddNew && <AddNewRow label={addLabel} onClick={() => { setOpen(false); onAddNew() }} />}
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

// `min` ('YYYY-MM-DD', optional): earlier days are greyed out and cannot be picked.
export function DatePicker({ label, value, onChange, req, error, hint, placeholder = 'Select date', className = '', minYear = 1950, maxYear = new Date().getFullYear() + 5, min }) {
  const [open, setOpen] = useState(false)
  const parsed = value ? new Date(value + 'T00:00:00') : null
  const minDate = min ? new Date(min + 'T00:00:00') : null
  const [view, setView] = useState(() => parsed || minDate || new Date())
  const ref = useRef(null)
  useDismiss(open, ref, () => setOpen(false))
  // Re-open on the selected month, or the first allowed month (not wherever the user last browsed).
  useEffect(() => { if (open && (parsed || minDate)) setView(parsed || minDate) }, [open])

  const y = view.getFullYear(), m = view.getMonth()
  const firstDay = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const cells = [...Array(firstDay).fill(null), ...Array(daysInMonth).fill(0).map((_, i) => i + 1)]
  const years = []
  const lowYear = Math.max(minYear, minDate ? minDate.getFullYear() : minYear)
  for (let yr = maxYear; yr >= lowYear; yr--) years.push(yr)
  const display = parsed ? parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null
  const shift = n => setView(new Date(y, m + n, 1))
  // No going back past the month that holds `min`.
  const canGoBack = !minDate || new Date(y, m, 1) > new Date(minDate.getFullYear(), minDate.getMonth(), 1)
  const monthBlocked = i => !!minDate && (y < minDate.getFullYear() || (y === minDate.getFullYear() && i < minDate.getMonth()))

  return (
    <div className={`block ${className}`}>
      {label && <span className="block text-xs font-medium text-slate-600 mb-1">{label}{req && <span className="text-red-500"> *</span>}</span>}
      <div className="relative" ref={ref}>
        <button type="button" onClick={() => setOpen(o => !o)}
          className={`w-full flex items-center justify-between gap-2 border rounded-xl px-3 py-2 bg-surface text-left focus:outline-none focus:ring-2 ${error ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-indigo-200'}`}>
          <span className={display ? 'text-slate-800' : 'text-slate-400'}>{display || placeholder}</span>
          <CalendarIcon size={16} className="shrink-0 text-slate-400" />
        </button>
        {open && (
          <div className="absolute z-50 mt-1 w-[16rem] bg-surface border border-slate-200 rounded-xl shadow-pop p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <button type="button" onClick={() => shift(-1)} disabled={!canGoBack} aria-label="Previous month"
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"><ChevronLeft size={16} /></button>
              <select value={m} onChange={e => setView(new Date(y, +e.target.value, 1))} className="flex-1 text-sm border border-slate-200 rounded-lg px-1.5 py-1 bg-surface">
                {MONTHS.map((mn, i) => <option key={mn} value={i} disabled={monthBlocked(i)}>{mn}</option>)}
              </select>
              <select value={y} onChange={e => {
                const ny = +e.target.value
                // Jumping to min's year from a later month must not land on a blocked month.
                setView(minDate && ny === minDate.getFullYear() && m < minDate.getMonth() ? new Date(ny, minDate.getMonth(), 1) : new Date(ny, m, 1))
              }} className="text-sm border border-slate-200 rounded-lg px-1.5 py-1 bg-surface max-h-40">
                {years.map(yr => <option key={yr} value={yr}>{yr}</option>)}
              </select>
              <button type="button" onClick={() => shift(1)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"><ChevronRight size={16} /></button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {WD.map(d => <div key={d} className="text-[10px] font-medium text-slate-400 py-1">{d}</div>)}
              {cells.map((d, i) => d === null ? <div key={`b${i}`} /> : (() => {
                const iso = toISO(y, m, d)
                const sel = iso === value
                const blocked = !!min && iso < min
                return (
                  <button type="button" key={iso} disabled={blocked} aria-disabled={blocked}
                    onClick={() => { onChange(iso); setOpen(false) }}
                    title={blocked ? 'Not available' : undefined}
                    className={`h-8 rounded-lg text-sm ${sel ? 'bg-indigo-600 text-white font-medium' : blocked ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-indigo-50'}`}>{d}</button>
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

// Month + year picker. value = { y, m } (m is 0–11).
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export function MonthPicker({ value, onChange, className = '' }) {
  const [open, setOpen] = useState(false)
  const [y, setY] = useState(value.y)
  const ref = useRef(null)
  useDismiss(open, ref, () => setOpen(false))
  useEffect(() => { if (open) setY(value.y) }, [open])
  const now = new Date()
  return (
    <div className={`relative ${className}`} ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-haspopup="dialog" aria-expanded={open}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-slate-800 hover:bg-slate-100 tabular-nums">
        <CalendarIcon size={16} className="text-indigo-600" />{MONTHS[value.m]} {value.y}
        <ChevronDown size={15} className={`text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-1/2 -translate-x-1/2 w-64 bg-surface border border-slate-200 rounded-xl shadow-pop p-3">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setY(v => v - 1)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Previous year"><ChevronLeft size={16} /></button>
            <span className="font-semibold text-slate-800 tabular-nums">{y}</span>
            <button type="button" onClick={() => setY(v => v + 1)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Next year"><ChevronRight size={16} /></button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS_SHORT.map((mn, i) => {
              const sel = y === value.y && i === value.m
              const isNow = y === now.getFullYear() && i === now.getMonth()
              return (
                <button key={mn} type="button" onClick={() => { onChange({ y, m: i }); setOpen(false) }}
                  className={`py-2 rounded-lg text-sm font-medium transition ${sel ? 'bg-indigo-600 text-white' : isNow ? 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100' : 'text-slate-700 hover:bg-slate-100'}`}>{mn}</button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export const Card = ({ className = '', children }) => (
  <div className={`bg-surface border border-line rounded-lg shadow-card ${className}`}>{children}</div>
)

// A centred dialog used by both masters for create / edit.
export const Modal = ({ title, sub, onClose, children, size = 'max-w-lg' }) => (
  <div className="fixed inset-0 z-50 grid place-items-start md:place-items-center overflow-y-auto bg-black/55 backdrop-blur-[2px] p-3 md:p-6" onMouseDown={onClose}>
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

// Status → colour, the same meaning everywhere (DESIGN.md §6). Violet is never a status.
export const STATUS_TONE = { ok: 'bg-ok', away: 'bg-away', idle: 'bg-idle', brk: 'bg-brk', off: 'bg-off', none: 'bg-fg-3' }

// 8px dot. "Working" (ok + live) breathes; everything else is still.
export const StatusDot = ({ tone = 'none', live = false, className = '' }) => (
  <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${STATUS_TONE[tone]} ${live && tone === 'ok' ? 'breathe' : ''} ${className}`} aria-hidden="true" />
)

// Neutral chip; tinted only when action is needed (warn) or something failed (bad).
const CHIP = { neutral: 'bg-surface-2 text-fg-2', warn: 'bg-amber-100 text-amber-700', bad: 'bg-red-50 text-red-700', ok: 'bg-green-50 text-green-700', accent: 'bg-violet-tint text-violet-strong' }
export const Chip = ({ tone = 'neutral', dot, className = '', children, ...p }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs whitespace-nowrap ${CHIP[tone]} ${className}`} {...p}>
    {dot && <StatusDot tone={dot} />}{children}
  </span>
)

// Older name, kept for existing pages.
const PILL_TONE = { ok: 'ok', risk: 'warn', late: 'bad', done: 'neutral', info: 'accent', neutral: 'neutral' }
export const Pill = ({ tone = 'neutral', children }) => <Chip tone={PILL_TONE[tone] || 'neutral'} className="font-medium">{children}</Chip>

// primary = brand gradient; default/secondary = hairline outline; ghost = text only.
export const Button = ({ variant = 'default', className = '', type = 'button', ...p }) => {
  const v = {
    primary: 'grad-brand border-transparent text-white shadow-glow hover:-translate-y-px',
    default: 'bg-transparent border-line text-fg hover:bg-violet-tint',
    secondary: 'bg-transparent border-line text-fg hover:bg-violet-tint',
    success: 'bg-ok border-transparent text-white hover:-translate-y-px',
    danger: 'bg-off border-transparent text-white hover:-translate-y-px',
    ghost: 'border-transparent text-fg-2 hover:bg-violet-tint hover:text-fg',
  }[variant]
  return <button type={type} className={`inline-flex items-center justify-center gap-1.5 border rounded-md px-3.5 py-2 font-medium transition duration-200 ease-out active:scale-[.985] disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 ${v} ${className}`} {...p} />
}

// A styled confirmation dialog — replaces the browser's native confirm().
// Usage: keep state `const [confirm, setConfirm] = useState(null)` and render
// {confirm && <ConfirmDialog {...confirm} onClose={() => setConfirm(null)} />}
export const ConfirmDialog = ({ title = 'Are you sure?', message, confirmLabel = 'Delete', tone = 'danger', onConfirm, onClose }) => {
  const [busy, setBusy] = useState(false)
  const go = async () => { setBusy(true); try { await onConfirm() } finally { setBusy(false); onClose() } }
  const Icon = tone === 'danger' ? Trash2 : AlertTriangle
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 backdrop-blur-[2px] p-4" onMouseDown={onClose}>
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
  <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
    <div>
      <h1 className="text-[32px] leading-tight">{title}</h1>
      {sub && <p className="text-fg-2 mt-1">{sub}</p>}
    </div>
    {actions && <div className="flex gap-2 flex-wrap items-center">{actions}</div>}
  </div>
)

export const Textarea = ({ label, hint, error, req, className = '', ...p }) => (
  <label className={`block ${className}`}>
    {label && <span className="block text-xs font-medium text-slate-600 mb-1">{label}{req && <span className="text-red-500"> *</span>}</span>}
    <textarea rows={3} className={`w-full border rounded-xl px-3 py-2 resize-y focus:outline-none focus:ring-2 ${error ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-indigo-200'}`} {...p} />
    {error ? <span className="block text-xs text-red-600 mt-1">{error}</span> : hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
  </label>
)

// Text input. Password fields get a Show/Hide toggle. Error turns the border red with a 12px message.
export function Input({ label, hint, error, req, className = '', type = 'text', ...p }) {
  const [show, setShow] = useState(false)
  const pw = type === 'password'
  return (
    <label className={`block ${className}`}>
      {label && <span className="block text-xs font-medium text-fg mb-1.5">{label}{req && <span className="text-off"> *</span>}</span>}
      <span className="relative block">
        <input type={pw && show ? 'text' : type} aria-invalid={!!error}
          className={`w-full bg-surface border rounded-md px-3.5 py-3 text-fg transition duration-200 focus:outline-none focus:ring-4 ${pw ? 'pr-16' : ''} ${error ? 'border-off focus:ring-off/20' : 'border-line focus:border-violet focus:ring-violet/20'}`} {...p} />
        {pw && <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-fg-3 hover:text-fg px-1" aria-label={show ? 'Hide password' : 'Show password'}>{show ? 'Hide' : 'Show'}</button>}
      </span>
      {error ? <span className="block text-xs text-off mt-1.5" role="alert">{error}</span> : hint && <span className="block text-xs text-fg-3 mt-1.5">{hint}</span>}
    </label>
  )
}

export const Select = ({ label, options, className = '', ...p }) => (
  <label className={`block ${className}`}>
    {label && <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>}
    <select className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-surface" {...p}>
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

// Micro-label, 30px Outfit light number, optional status dot.
export const KpiCard = ({ label, value, dot, note }) => (
  <Card className="px-4 py-3.5">
    <div className="micro">{label}</div>
    <div className="font-display font-light text-[30px] leading-tight text-fg flex items-center gap-2 mt-0.5">{dot && <StatusDot tone={dot} />}{value}</div>
    {note && <div className="text-xs text-fg-3 mt-0.5">{note}</div>}
  </Card>
)
export const Kpi = ({ label, value, note }) => <KpiCard label={label} value={value} note={note} />

// Detail views slide in from the right (max 640px, dim backdrop, 300ms). Esc or a click outside closes it.
export function Drawer({ open, onClose, title, sub, aside, children }) {
  useEffect(() => {
    if (!open) return
    const k = e => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k)
  }, [open, onClose])
  return (
    <>
      <div onClick={onClose} className={`fixed inset-0 z-40 bg-black/45 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
      <aside role="dialog" aria-modal="true" aria-hidden={!open} aria-label={typeof title === 'string' ? title : undefined}
        className={`fixed top-0 right-0 bottom-0 z-50 w-full max-w-[640px] bg-surface border-l border-line shadow-card overflow-y-auto px-7 py-6 transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-[102%]'}`}>
        {open && <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><h2 className="text-[26px] leading-tight truncate">{title}</h2>{sub && <div className="text-xs text-fg-3 mt-0.5">{sub}</div>}</div>
            <div className="flex items-center gap-2 shrink-0">{aside}<button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-md text-fg-2 hover:bg-violet-tint hover:text-fg"><X size={18} strokeWidth={1.5} /></button></div>
          </div>
          {children}
        </>}
      </aside>
    </>
  )
}

// Thin gradient ring with a value inside (e.g. hours toward the 9 h day). value 0–1.
export function ProgressRing({ value = 0, size = 128, stroke = 9, children }) {
  const r = 64 - stroke / 2 - 1, c = 2 * Math.PI * r
  const id = useRef(`ring-${Math.random().toString(36).slice(2)}`).current
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90" aria-hidden="true">
        <defs><linearGradient id={id} x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="var(--color-brand-700)" /><stop offset="1" stopColor="var(--color-brand-200)" /></linearGradient></defs>
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth={stroke} />
        <circle cx="64" cy="64" r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))} style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">{children}</div>
    </div>
  )
}

// Loading placeholder (skeletons, not spinners).
export const Skeleton = ({ className = '' }) => <div className={`skeleton rounded-md ${className}`} aria-hidden="true" />

// Empty state: icon, one sentence, one action.
export const EmptyState = ({ icon: Icon = Inbox, text, action }) => (
  <div className="py-12 px-6 text-center">
    <Icon size={22} strokeWidth={1.5} className="mx-auto text-fg-3" />
    <p className="mt-3 text-fg-2">{text}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
)
