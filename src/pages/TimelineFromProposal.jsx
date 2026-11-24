import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, ArrowUp, X, Check, GripVertical } from 'lucide-react'
import { sampleProposal } from '../data/mock.js'
import { Card, Button, Pill } from '../components/ui.jsx'
import { api } from '../lib/api.js'
import { isoDate } from '../lib/proposal.js'

const COL = ['#5ee6ff', '#8b7cff', '#4ade9b', '#ff7ac6', '#ffb454', '#7ca8ff']
const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
const addWork = (d, n) => { d = new Date(d); let k = 0; while (k < n) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) k++ } return d }
const nextMonday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return d }
// Proposal read from the uploaded PDF (see lib/readProposal.js); falls back to the built-in sample.
let P = sampleProposal
const SRC = { you: ['ok', 'You'], prop: ['info', 'Proposal'], ai: ['risk', 'AI assumed'] }

// ---------- plan logic (simulated AI) ----------
function generate(A, vi) {
  const jit = [1, 0.9, 1.12, 0.95, 1.05][vi % 5]
  // When the proposal gives days for everything, its own plan is complete: no UAT or buffer is added unless asked for or stated.
  const allWritten = P.modules.every(m => m.features.every(f => f[2]))
  const uat = A.uat === null || A.uat === undefined ? (!allWritten || !!P.uatDays) : A.uat !== false, mode = A.mode || 'seq'
  // feature = [name, weeks, daysWrittenInProposal]. Days written in the proposal are used as they are.
  let mod = P.modules.map((m, i) => A.modMonths[i] ? { d: A.modMonths[i] * 22, src: 'you' }
    : { d: m.features.reduce((a, f) => a + f[1] * 5 * (f[2] ? 1 : jit), 0), src: m.features.every(f => f[2]) ? 'prop' : 'ai' })
  // Fitting to a total and "make it shorter" only touch assumed days. Days you gave or the proposal wrote are never rescaled.
  const keep = x => x.src === 'you' || x.src === 'prop'
  if (A.total) {
    const fixed = mod.filter(keep).reduce((a, x) => a + x.d, 0), free = mod.filter(x => !keep(x)).reduce((a, x) => a + x.d, 0)
    const target = A.total * 22 * (uat ? 0.85 : 1) * (mode === 'overlap' ? 1.15 : 1) - fixed
    if (free && target > 0) mod = mod.map(x => keep(x) ? x : { d: x.d * target / free, src: 'ai' })
  }
  if (A.scale && A.scale !== 1) mod = mod.map(x => keep(x) ? x : { d: x.d * A.scale, src: 'ai' })
  const rows = []
  P.modules.forEach((m, i) => {
    const tot = m.features.reduce((a, f) => a + f[1], 0)
    rows.push({ mod: true, name: m.name, ci: i % 5 })
    // Written days are used as they are (half days round up); assumed ones are spread by weight, at least 2 days.
    m.features.forEach(f => rows.push(mod[i].src === 'prop'
      ? { name: f[0], days: Math.max(1, Math.ceil(f[1] * 5 - 1e-9)), src: 'prop', ci: i % 5 }
      : { name: f[0], days: Math.max(2, Math.round(mod[i].d * f[1] / tot)), src: mod[i].src, ci: i % 5 }))
  })
  if (uat) {
    const src = A.uat ? 'you' : P.uatDays ? 'prop' : 'ai'
    rows.push({ mod: true, name: 'Testing & go-live', ci: 5 }, { name: 'UAT with client', days: P.uatDays || 10, src, ci: 5 },
      { name: 'Buffer', days: Math.round(rows.filter(r => !r.mod).reduce((a, r) => a + r.days, 0) * 0.08), src: 'ai', ci: 5 })
  }
  return recalc({ rows, start: A.start ? new Date(A.start) : nextMonday(), startSrc: A.start ? (A.startProp ? 'prop' : 'you') : 'ai', mode })
}

function recalc(v) {
  const rows = v.rows.map(r => ({ ...r }))
  let cursor = addWork(v.start, 0); cursor.setDate(cursor.getDate() - 1)
  let prevMod = null
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]; if (!r.mod) continue
    const secs = []; for (let j = i + 1; j < rows.length && !rows[j].mod; j++) secs.push(rows[j])
    let c = new Date(cursor)
    if (v.mode === 'overlap' && prevMod && r.ci !== 5) { c = addWork(prevMod.s, Math.max(1, Math.round(prevMod.days * 0.7)) - 1); c.setDate(c.getDate() - 1) }
    r.s = addWork(c, 1)
    secs.forEach(s => { s.s = addWork(c, 1); s.e = addWork(c, s.days); c = new Date(s.e) })
    r.e = secs.length ? c : r.s; r.days = secs.reduce((a, s) => a + s.days, 0)
    r.src = secs.every(s => s.src === 'you') ? 'you' : secs.every(s => s.src !== 'ai') ? 'prop' : 'ai'
    if (r.e > cursor) cursor = new Date(r.e)
    prevMod = r
  }
  const end = rows.reduce((m, r) => r.e > m ? r.e : m, v.start)
  let wd = 0; for (let d = new Date(v.start); d <= end; d.setDate(d.getDate() + 1)) if (d.getDay() % 6) wd++
  return { ...v, rows, end, wd }
}

// ---------- plan chart (drag a bar's edge to resize, drag a name to reorder) ----------
function Chart({ v, onDays, onMove }) {
  const s0 = new Date(v.start.getFullYear(), v.start.getMonth(), 1), e0 = new Date(v.end.getFullYear(), v.end.getMonth() + 1, 1)
  // The user sets the zoom and the width of the name column; both are remembered on this computer.
  const [zoom, setZoom] = useState(() => +localStorage.getItem('plan.zoom') || 1)
  const [nameW, setNameW] = useState(() => +localStorage.getItem('plan.nameW') || 340)
  useEffect(() => { localStorage.setItem('plan.zoom', zoom); localStorage.setItem('plan.nameW', nameW) }, [zoom, nameW])
  const days = Math.round((e0 - s0) / 864e5), PX = Math.max(3, Math.min(16, 1100 / days)) * zoom, X = d => Math.round((d - s0) / 864e5) * PX
  const months = [], weeks = []
  for (let d = new Date(s0); d < e0; d.setMonth(d.getMonth() + 1)) months.push(new Date(d))
  for (let d = new Date(s0); d < e0; d.setDate(d.getDate() + 1)) if (d.getDay() === 1) weeks.push(new Date(d))
  const H = r => r.mod ? 46 : 40
  const [col, setCol] = useState(null)
  const startCol = e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setCol({ x0: e.clientX, w0: nameW }) }
  const moveCol = e => col && setNameW(Math.max(180, Math.min(640, col.w0 + e.clientX - col.x0)))

  // Resize: 7 calendar days on screen = 5 working days.
  const [rs, setRs] = useState(null)
  const startResize = (e, i, r) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); setRs({ i, x0: e.clientX, days0: r.days, days: r.days }) }
  const moveResize = e => rs && setRs({ ...rs, days: Math.max(1, rs.days0 + Math.round((e.clientX - rs.x0) / PX * 5 / 7)) })
  const endResize = () => { if (!rs) return; if (rs.days !== rs.days0) onDays(rs.i, rs.days); setRs(null) }
  // Reorder
  const [dnd, setDnd] = useState(null)
  const drop = to => { if (dnd && dnd.from !== to) onMove(dnd.from, to); setDnd(null) }

  return (
    <>
    <div className="flex flex-wrap items-center justify-end gap-2 mb-2 text-slate-600">
      <span>Zoom</span>
      <button onClick={() => setZoom(z => Math.max(0.4, +(z - 0.2).toFixed(1)))} disabled={zoom <= 0.4} aria-label="Zoom out" className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-100 hover:border-slate-300 disabled:opacity-40 text-base">−</button>
      <input type="range" min="0.4" max="4" step="0.2" value={zoom} onChange={e => setZoom(+e.target.value)} aria-label="Zoom level" className="w-32 accent-[#5ee6ff] !bg-transparent" />
      <button onClick={() => setZoom(z => Math.min(4, +(z + 0.2).toFixed(1)))} disabled={zoom >= 4} aria-label="Zoom in" className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-100 hover:border-slate-300 disabled:opacity-40 text-base">+</button>
      <button onClick={() => { setZoom(1); setNameW(340) }} className="px-2.5 h-8 rounded-lg border border-slate-200 bg-slate-100 hover:border-slate-300">Reset</button>
    </div>
    <div className="flex border border-slate-200 rounded-xl overflow-hidden select-none">
      <div className="relative shrink-0 border-r border-slate-200 bg-white/60" style={{ width: nameW, maxWidth: '60%' }}>
        <div role="separator" aria-orientation="vertical" aria-label="Drag to change the width of the names column" title="Drag to resize"
          onPointerDown={startCol} onPointerMove={moveCol} onPointerUp={() => setCol(null)} onPointerCancel={() => setCol(null)}
          className={`absolute -right-1.5 top-0 bottom-0 w-3 z-10 cursor-col-resize touch-none grid place-items-center group/sep`}><span className={`w-[3px] h-full ${col ? 'bg-indigo-600' : 'bg-transparent group-hover/sep:bg-indigo-600/60'}`} /></div>
        <div className="h-[52px] border-b border-slate-200 bg-slate-50/70 flex items-end px-3 pb-1.5 text-xs text-slate-500">Module / section</div>
        {v.rows.map((r, i) => (
          <div key={i} draggable title={`${r.name} (drag to reorder)`} style={{ height: H(r) }}
            onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); setDnd({ from: i, over: i }) }}
            onDragOver={e => { if (!dnd) return; e.preventDefault(); dnd.over !== i && setDnd({ ...dnd, over: i }) }}
            onDrop={e => { e.preventDefault(); drop(i) }} onDragEnd={() => setDnd(null)}
            className={`group flex items-center gap-1.5 border-b border-slate-100 cursor-grab active:cursor-grabbing ${r.mod ? 'font-semibold px-2 text-sm text-slate-900' : 'pl-6 pr-3 text-[13px] text-slate-700'} ${dnd?.from === i ? 'opacity-40' : ''} ${dnd && dnd.over === i && dnd.from !== i ? 'shadow-[inset_0_2px_0_0_#5ee6ff] bg-indigo-50/60' : ''}`}>
            <GripVertical size={13} className="shrink-0 text-slate-300 group-hover:text-slate-500" />
            {r.mod && <span className="w-1 h-4 rounded shrink-0" style={{ background: COL[r.ci] }} />}
            <span className="truncate">{r.name}</span>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto flex-1">
        <div className="relative" style={{ width: days * PX }}>
          <div className="relative h-7 border-b border-slate-200 bg-slate-50/70">
            {months.map(m => <div key={+m} className="absolute top-0 h-full border-l border-slate-200 px-2 text-[13px] font-medium leading-7 text-slate-800 whitespace-nowrap overflow-hidden" style={{ left: X(m) }}>{m.toLocaleDateString('en-GB', { month: 'short' })} {String(m.getFullYear()).slice(2)}</div>)}
          </div>
          <div className="relative h-6 border-b border-slate-200 bg-slate-50/70">
            {PX >= 5 && weeks.map(w => <div key={+w} className="absolute text-[11px] leading-6 text-slate-500 px-0.5" style={{ left: X(w) }}>{w.getDate()}</div>)}
          </div>
          <div className="relative">
            {months.map(m => <div key={+m} className="absolute top-0 bottom-0 border-l border-slate-100" style={{ left: X(m) }} />)}
            {v.rows.map((r, i) => {
              const c = COL[r.ci], live = rs?.i === i, d = live ? rs.days : r.days
              const w = X(r.e) - X(r.s) + PX + (live ? (rs.days - rs.days0) * PX * 7 / 5 : 0)
              return (
                <div key={i} style={{ height: H(r) }} className="relative border-b border-slate-100">
                  <div title={`${r.name}: ${fmt(r.s)} – ${fmt(r.e)}`} className="absolute rounded-md whitespace-nowrap text-xs px-2 overflow-visible"
                    style={{ left: X(r.s), width: Math.max(PX, w), top: r.mod ? 10 : 9, height: r.mod ? 26 : 22, lineHeight: r.mod ? '26px' : '21px', background: r.mod ? c : c + (live ? '70' : '38'), color: r.mod ? '#070b1d' : '#e3e7fa', fontWeight: r.mod ? 600 : 400, boxShadow: r.mod ? `0 0 18px -6px ${c}` : 'none', border: !r.mod && r.src === 'ai' ? `1px dashed ${c}` : 'none' }}>
                    {r.mod ? `${fmt(r.s)} – ${fmt(r.e)}` : `${d}d`}
                    {!r.mod && <span role="slider" tabIndex={-1} aria-label={`Drag to change the days of ${r.name}`} aria-valuenow={d} aria-valuemin={1}
                      onPointerDown={e => startResize(e, i, r)} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={endResize}
                      className="absolute -right-1.5 -top-1 -bottom-1 w-3.5 cursor-ew-resize touch-none grid place-items-center"><span className="w-[3px] h-3 rounded-full" style={{ background: c }} /></span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

// ---------- assistant pieces ----------
const THINK_AI = ['Reading your message', 'Checking the current plan', 'Working out the answer']
const THINK_BUILD = ['Laying out the modules', 'Placing sections on working days', 'Checking the finish date']
const noMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

// Shows a reply as it "arrives", a few characters at a time.
function Typed({ text, onTick }) {
  const [n, setN] = useState(noMotion() ? text.length : 0)
  useEffect(() => {
    if (n >= text.length) return
    const id = setTimeout(() => setN(x => Math.min(text.length, x + 3)), 14)
    return () => clearTimeout(id)
  }, [n, text])
  useEffect(() => { onTick?.() }, [n])
  return <>{text.slice(0, n)}{n < text.length && <span className="caret" />}</>
}

function Thinking({ steps }) {
  const [i, setI] = useState(0)
  useEffect(() => { const id = setInterval(() => setI(x => Math.min(x + 1, steps.length - 1)), 1700); return () => clearInterval(id) }, [steps])
  return (
    <div className="flex gap-3 rise" role="status" aria-live="polite">
      <span className="orb orb-live w-6 h-6 shrink-0 mt-0.5" />
      <div>
        {steps.slice(0, i).map(s => <div key={s} className="flex items-center gap-1.5 text-xs text-slate-400 mb-1"><Check size={12} className="text-green-600" />{s}</div>)}
        <div className="shimmer font-medium">{steps[i]}…</div>
      </div>
    </div>
  )
}

const QUESTIONS = [
  { key: 'start', text: 'When will the project start?', opts: [['Next Monday', 'mon']], hint: 'Or type a date like 2026-12-07' },
  { key: 'total', text: "What's the expected total timeline?", opts: [['3 months', 3], ['4 months', 4], ['6 months', 6]], hint: 'Or type a number of months' },
  { key: 'modMonths', text: 'How many months for each module? Fill only what you know.' },
  { key: 'mode', text: 'Should modules run one after another, or overlap?', opts: [['One after another', 'seq'], ['Overlap a little', 'overlap']] },
  { key: 'uat', text: 'Add testing (UAT) and a buffer at the end?', opts: [['Yes, add both', true], ['No', false]] },
]
const chip = 'px-3 py-1.5 rounded-full border border-slate-300 bg-slate-100 text-slate-700 text-xs hover:border-indigo-500 hover:text-indigo-700 transition disabled:opacity-50'

// ---------- page ----------
export default function TimelineFromProposal() {
  const nav = useNavigate()
  P = JSON.parse(sessionStorage.getItem('proposal') || 'null') || sampleProposal
  const manual = !!P.manual
  const project = JSON.parse(sessionStorage.getItem('newProject') || 'null') || { name: 'New project', client: 'Sample client', file: P.file, start: '' }
  const start0 = project.start || P.start || null
  const [A, setA] = useState({ start: start0, startProp: !project.start && !!P.start, total: P.totalMonths || null, modMonths: {}, mode: null, uat: null, scale: 1 })
  const [step, setStep] = useState(manual ? QUESTIONS.length : start0 ? 1 : 0)
  const [msgs, setMsgs] = useState([])
  // "My own timeline" starts with one empty module to fill in.
  const [versions, setVersions] = useState(() => manual ? [recalc({ rows: [{ mod: true, name: 'Module 1', ci: 0 }, { name: 'Section 1', days: 5, src: 'you', ci: 0 }], start: project.start ? new Date(project.start + 'T00:00:00') : nextMonday(), startSrc: project.start ? 'you' : 'ai', mode: 'seq' })] : [])
  const [cur, setCur] = useState(manual ? 0 : -1)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const [txt, setTxt] = useState('')
  const [mm, setMm] = useState({})
  const [thinking, setThinking] = useState(null) // null | 'build' | 'ai'
  const [open, setOpen] = useState(!manual)       // assistant panel
  const [model, setModel] = useState('')
  const box = useRef(null), input = useRef(null), vref = useRef(versions)
  vref.current = versions
  const add = (...m) => setMsgs(x => [...x, ...m])
  const toBottom = () => { box.current && (box.current.scrollTop = 1e6) }
  useEffect(toBottom, [msgs, thinking, open, step])
  useEffect(() => { const k = e => e.key === 'Escape' && setOpen(false); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [])
  useEffect(() => { open && input.current?.focus() }, [open])

  useEffect(() => {
    if (manual) return add({ who: 'ai', text: <>This is your own timeline, so nothing was drafted for you. Add modules and sections in the table and set the days.<br /><br />If you want a hand, ask me, for example <i>"add a testing module with UAT 10 days"</i>.</> })
    const all = P.modules.flatMap(m => m.features), n = all.filter(f => f[2]).length
    add({ who: 'ai', text: <>I read <b>{project.file}</b> and found <b>{P.modules.length} modules</b> with <b>{all.length} features</b>. {P.outOfScope.length ? <>It lists <b>{P.outOfScope.length} exclusions</b> (out of scope).</> : <>It lists <b>no exclusions</b>, so there is no out-of-scope list.</>} {n === 0 ? "It doesn't say how long anything takes." : n === all.length ? <>Days are written for <b>all {n} features</b>, so I'll use them as they are.</> : <>Days are written for <b>{n} of {all.length}</b> features. I'll assume the rest.</>}{P.uatDays && <> UAT: <b>{P.uatDays} days</b>.</>}{P.statedTotal ? <> Total duration in the proposal: <b>{P.statedTotal}</b>.</> : P.totalMonths && <> Total duration in the proposal: <b>{P.totalMonths} months</b>.</>}{P.warnings?.length > 0 && <><br /><br /><b>Please check:</b> {P.warnings.join(' ')}</>}{P.readBy === 'rules' && <><br /><br /><b>Note:</b> read by the built-in reader, not AI. {P.aiNote}</>}<br /><br />A few quick questions. All of them are optional: press <b>Skip</b> and I'll {n ? 'keep what the proposal says' : 'assume'}.{start0 && <><br /><br />Start date taken from the {project.start ? 'project' : 'proposal'}: <b>{start0}</b>.</>}</> })
  }, [])

  const firstWord = () => (P.modules[0]?.name || 'Module').split(' ')[0]
  const build = (answers, note) => {
    setThinking('build')
    setTimeout(() => {
      const nv = [...vref.current, generate(answers, vref.current.length)]
      setVersions(nv); setCur(nv.length - 1); add({ who: 'ai', text: note(nv.length) })
      setSaved(false); setThinking(null)
    }, 1500)
  }
  const doneNote = n => <>Done: <b>version {n}</b>. Anything marked <Pill tone="risk">AI assumed</Pill> is my guess, so check those.<br /><br />Tell me any change in your own words, for example <i>"{firstWord()} 6 weeks"</i> or <i>"fit it in 4 months"</i>. You can also drag the bars in the plan.</>

  const answer = (key, value, label) => {
    add({ who: 'me', text: label })
    const v = key === 'start' && value === 'mon' ? isoDate(nextMonday()) : key === 'total' && value === null && P.totalMonths ? P.totalMonths : value
    const nA = { ...A, [key]: v, ...(key === 'start' ? { startProp: false } : {}) }; setA(nA)
    const ns = step + 1; setStep(ns)
    if (ns >= QUESTIONS.length) build(nA, doneNote)
  }

  const toRows = rows => { let ci = -1; return rows.map(x => x.kind === 'module' ? { mod: true, name: x.name, ci: ++ci % 6 } : { name: x.name, days: x.days, src: x.basis === 'user' ? 'you' : x.basis === 'proposal' ? 'prop' : 'ai', ci: Math.max(ci, 0) % 6 }) }

  // Free text goes to the real AI, with the proposal and the plan on screen as context.
  const send = async override => {
    const t = (override ?? txt).trim(); if (!t || thinking) return
    setTxt(''); if (input.current) input.current.style.height = ''
    if (step < QUESTIONS.length) {
      const q = QUESTIONS[step]
      if (q.key === 'start' && /^\d{4}-\d{2}-\d{2}$/.test(t)) return answer('start', t, t)
      if (q.key === 'total' && +t > 0) return answer('total', +t, `${t} months`)
    }
    add({ who: 'me', text: t })
    if (!project.id) return add({ who: 'ai', text: 'Open this screen from a project to chat about its timeline.', error: true })

    // Typed before finishing the questions: draft with what we have, then apply the message.
    let base = versions[cur], count = versions.length
    if (!base) { base = generate(A, 0); setVersions([base]); setCur(0); setStep(QUESTIONS.length); count = 1 }

    setThinking('ai')
    try {
      const r = await api(`/projects/${project.id}/assistant`, { method: 'POST', body: {
        message: t.slice(0, 1000),
        history: msgs.filter(m => typeof m.text === 'string' && !m.error).slice(-10).map(m => ({ who: m.who === 'me' ? 'user' : 'assistant', text: m.text.slice(0, 1500) })),
        proposal: manual ? null : { modules: P.modules.slice(0, 60).map(m => ({ name: m.name.slice(0, 255), features: m.features.slice(0, 80).map(f => f[0].slice(0, 255)) })), outOfScope: P.outOfScope.slice(0, 60).map(x => x.slice(0, 255)), totalMonths: P.totalMonths || null },
        timeline: { startDate: isoDate(base.start), endDate: isoDate(base.end), workingDays: base.wd, mode: base.mode,
          rows: base.rows.map(x => ({ kind: x.mod ? 'module' : 'section', name: x.name.slice(0, 255), days: x.mod ? 0 : x.days, basis: x.src === 'you' ? 'user' : x.src === 'prop' ? 'proposal' : 'assumed' })) },
      } })
      setModel(r.model || '')
      if (r.changed) {
        const nv = recalc({ rows: toRows(r.rows), start: r.startDate ? new Date(r.startDate + 'T00:00:00') : base.start, startSrc: r.startDate ? 'you' : base.startSrc, mode: r.mode || base.mode })
        setVersions(vs => [...vs, nv]); setCur(count); setSaved(false)
        add({ who: 'ai', text: r.reply, stream: true, tag: `Plan updated: version ${count + 1}, finishes ${fmt(nv.end)}` })
      } else add({ who: 'ai', text: r.reply, stream: true })
    } catch (e) { add({ who: 'ai', text: e.message, error: true }) }
    setThinking(null)
  }

  const v = versions[cur]
  // Stores the version on screen as the project's planned timeline.
  const saveFinal = async () => {
    if (!project.id) return setSaveErr('Open this screen from a project to save its timeline.')
    if (v.rows.some(r => !r.name.trim())) return setSaveErr('Every module and section needs a name.')
    setSaving(true); setSaveErr('')
    try {
      const { timeline } = await api(`/projects/${project.id}/timelines`, { method: 'POST', body: {
        mode: v.mode, proposalId: P.proposalId || null,
        rows: v.rows.map(r => ({ kind: r.mod ? 'module' : 'section', name: r.name.trim(), days: r.days, start: isoDate(r.s), end: isoDate(r.e), source: r.src === 'prop' ? 'proposal' : r.src })),
      } })
      setSaved(timeline)
      add({ who: 'ai', text: <>Saved <b>version {cur + 1}</b> to the project as its planned timeline.</> })
    } catch (e) { setSaveErr(e.message) }
    setSaving(false)
  }
  const patch = fn => { setVersions(versions.map((x, j) => j === cur ? recalc(fn(x)) : x)); setSaved(false) }
  const setRows = rows => patch(x => ({ ...x, rows }))
  const edit = (i, k, val) => {
    if (k === 'days' && !(val >= 1)) return
    setRows(v.rows.map((r, j) => j === i ? { ...r, [k]: val, ...(k === 'days' ? { src: 'you' } : {}) } : r))
  }
  const addSection = i => { let j = i + 1; while (j < v.rows.length && !v.rows[j].mod) j++; const r = [...v.rows]; r.splice(j, 0, { name: 'New section', days: 5, src: 'you', ci: v.rows[i].ci }); setRows(r) }
  const addModule = () => { const ci = v.rows.filter(r => r.mod).length % 6; setRows([...v.rows, { mod: true, name: 'New module', ci }, { name: 'New section', days: 5, src: 'you', ci }]) }
  const removeRow = i => { const r = [...v.rows]; if (r[i].mod) { let j = i + 1; while (j < r.length && !r[j].mod) j++; r.splice(i, j - i) } else r.splice(i, 1); setRows(r) }
  // Drag and drop in the plan: a module moves with its sections; a section can move to another module.
  const moveRow = (from, to) => {
    const rows = [...v.rows], modStart = i => { while (i > 0 && !rows[i].mod) i--; return i }, blockEnd = i => { let j = i + 1; while (j < rows.length && !rows[j].mod) j++; return j }
    if (rows[from].mod) {
      const a = from, b = blockEnd(from), ts = modStart(to)
      if (ts === a) return
      const block = rows.slice(a, b), down = ts > a
      const at = down ? blockEnd(ts) - block.length : ts
      rows.splice(a, b - a); rows.splice(at, 0, ...block)
    } else {
      const target = rows[to]
      const [x] = rows.splice(from, 1)
      let at = rows.indexOf(target)
      // On a module name: becomes its first section. On a section: lands after it when dragged down, before it when dragged up.
      if (target.mod || to > from) at += 1
      rows.splice(at, 0, { ...x })
      rows[at].ci = rows[modStart(at)].ci
    }
    setRows(rows)
  }

  const q = step < QUESTIONS.length ? QUESTIONS[step] : null
  return (
    <div className={open ? 'xl:pr-[440px]' : ''}>
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-slate-500 mb-1"><Link to="/projects" className="hover:text-slate-800">Projects</Link> / {project.name} / Timeline</div>
            <h1 className="text-2xl font-semibold text-slate-900 truncate">{project.name} <span className="text-slate-400 font-normal text-lg">for {project.client}</span></h1>
          </div>
          <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex items-center gap-2 border border-slate-200 bg-slate-100 hover:border-indigo-500 rounded-xl px-3 py-1.5 font-medium text-slate-800 transition">
            <span className="orb w-4 h-4" />{open ? 'Hide assistant' : 'Ask the assistant'}
          </button>
        </div>

        {!manual && (
          <Card className="px-5 py-3">
            <details>
              <summary className="cursor-pointer text-slate-700">What the proposal covers: <b>{P.modules.length} modules</b>, <b>{P.modules.reduce((a, m) => a + m.features.length, 0)} features</b>, {P.outOfScope.length ? <b>{P.outOfScope.length} exclusions</b> : 'no exclusions listed'}</summary>
              <div className="grid gap-3 mt-4 md:grid-cols-2 xl:grid-cols-3">
                {P.modules.map((m, i) => (
                  <div key={i} className="border border-slate-200 rounded-xl px-3 py-2 text-xs"><b style={{ color: COL[i % 5] }}>{m.name}</b><ul className="text-slate-500 mt-1 space-y-0.5 list-disc pl-4">{m.features.map(f => <li key={f[0]}>{f[0]}</li>)}</ul></div>
                ))}
                {P.outOfScope.length > 0 && <div className="border border-amber-100 bg-amber-50/50 rounded-xl px-3 py-2 text-xs"><b className="text-amber-700">Out of scope</b><ul className="text-slate-500 mt-1 space-y-0.5 list-disc pl-4">{P.outOfScope.map(x => <li key={x}>{x}</li>)}</ul></div>}
              </div>
            </details>
          </Card>
        )}

        {!v ? (
          <Card className="p-12 text-center">
            <span className="orb w-10 h-10 inline-block" />
            <h2 className="text-lg font-semibold text-slate-900 mt-4">No plan yet</h2>
            <p className="text-slate-500 mt-1 max-w-md mx-auto">Answer the assistant's quick questions, or skip them and get a first draft to edit.</p>
            <div className="flex gap-2 justify-center mt-5 flex-wrap">
              {!open && <Button onClick={() => setOpen(true)}>Open the assistant</Button>}
              <Button variant="primary" disabled={!!thinking} onClick={() => { setStep(QUESTIONS.length); build(A, doneNote) }}>{thinking ? 'Drafting…' : 'Draft with defaults'}</Button>
            </div>
          </Card>
        ) : (
          <>
            <Card className="p-5">
              {saved && <div className="bg-green-50 text-green-700 rounded-xl px-3 py-2 mb-4 font-medium flex flex-wrap gap-2 justify-between items-center" role="status">Saved to the project as planned timeline v{saved.version}: {saved.workingDays} working days, go-live {fmt(new Date(saved.end + 'T00:00:00'))}.<Button variant="success" onClick={() => nav('/projects')}>Go to projects</Button></div>}
              {saveErr && <div className="bg-red-50 text-red-700 rounded-xl px-3 py-2 mb-4" role="alert">{saveErr}</div>}
              <div className="flex flex-wrap justify-between gap-3 items-start mb-4">
                <div>
                  <h2 className="font-semibold text-base text-slate-900">Planned timeline</h2>
                  <div className="text-slate-500 mt-0.5">{fmt(v.start)} to <b className="rail-text text-base">{fmt(v.end)}</b>, {v.wd} working days (about {(v.wd / 22).toFixed(1)} months)</div>
                </div>
                <div className="flex flex-wrap gap-1.5 items-center">
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 mr-1">Start
                    <input type="date" value={isoDate(v.start)} onChange={e => e.target.value && patch(x => ({ ...x, start: new Date(e.target.value + 'T00:00:00'), startSrc: 'you' }))} className="border border-slate-200 rounded-lg px-2 py-1 text-slate-800" /></label>
                  {versions.length > 1 && <><span className="text-xs text-slate-500">Versions</span>
                    {versions.map((_, i) => <button key={i} onClick={() => { setCur(i); setSaved(false) }} aria-pressed={i === cur} className={`px-2.5 py-1 rounded-lg border text-xs ${i === cur ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium' : 'border-slate-200 text-slate-600'}`}>v{i + 1}</button>)}</>}
                  {!manual && <Button disabled={!!thinking} onClick={() => { add({ who: 'me', text: 'Draft it again' }); build(A, n => <>Here's <b>version {n}</b> with different assumptions. Your answers are kept.</>) }}>Draft again</Button>}
                  <Button variant="primary" disabled={saving} onClick={saveFinal}>{saving ? 'Saving…' : 'Save as final'}</Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500 mb-3">
                {Object.values(SRC).map(([t, l]) => <span key={l} className="flex items-center gap-1.5"><Pill tone={t}>{l}</Pill>{l === 'You' ? 'set by you' : l === 'Proposal' ? 'written in the proposal' : 'a guess, please check'}</span>)}
                <span>Drag a bar's right edge to change its days, a name to reorder, and the column edge to widen the names. Weekends are skipped.</span>
              </div>
              <Chart v={v} onDays={(i, d) => edit(i, 'days', d)} onMove={moveRow} />
            </Card>

            <Card className="p-5">
              <div className="flex justify-between items-center mb-2"><h2 className="font-semibold text-slate-900">Edit timeline</h2><span className="text-xs text-slate-500">Change names or days and the dates update</span></div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="text-left text-xs text-slate-500">{['Module / section', 'Work days', 'Start', 'Finish', 'Source', ''].map(h => <th key={h} className="px-2 py-2 border-b border-slate-200 font-medium">{h}</th>)}</tr></thead>
                  <tbody>
                    {v.rows.map((r, i) => (
                      <tr key={i} className={r.mod ? 'bg-slate-100/60 font-semibold' : ''}>
                        <td className={`px-2 py-1.5 border-b border-slate-100 ${r.mod ? '' : 'pl-6'}`}><input aria-label={r.mod ? 'Module name' : 'Section name'} value={r.name} onChange={e => edit(i, 'name', e.target.value)} className="w-full !bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500 rounded-lg px-2 py-1 outline-none" /></td>
                        <td className="px-2 py-1.5 border-b border-slate-100 w-28">{r.mod ? <span className="px-2">{r.days}</span> : <input aria-label={`Work days for ${r.name}`} type="number" min="1" value={r.days} onChange={e => edit(i, 'days', +e.target.value)} className="w-20 border border-slate-200 rounded-lg px-2 py-1" />}</td>
                        <td className="px-2 py-1.5 border-b border-slate-100 whitespace-nowrap">{fmt(r.s)}</td>
                        <td className="px-2 py-1.5 border-b border-slate-100 whitespace-nowrap">{fmt(r.e)}</td>
                        <td className="px-2 py-1.5 border-b border-slate-100"><Pill tone={SRC[r.src][0]}>{SRC[r.src][1]}</Pill></td>
                        <td className="px-2 py-1.5 border-b border-slate-100 text-right whitespace-nowrap">
                          {r.mod && <Button variant="ghost" className="text-xs" onClick={() => addSection(i)}>+ section</Button>}
                          <button aria-label={`Remove ${r.name}`} className="text-slate-400 hover:text-red-500 ml-1 align-middle" onClick={() => removeRow(i)}><X size={15} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button className="mt-3" onClick={addModule}>+ Add module</Button>
            </Card>
          </>
        )}
      </div>

      {/* Assistant: a panel you open and close. Esc closes it. */}
      {!open && (
        <button onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rail text-ink font-medium rounded-full pl-2.5 pr-4 py-2.5 shadow-[0_10px_40px_-8px_#5ee6ff] hover:brightness-110" aria-label="Open the assistant">
          <span className="w-7 h-7 rounded-full bg-ink grid place-items-center"><Sparkles size={15} className="text-indigo-600" /></span>Assistant
        </button>
      )}
      {open && (
        <aside aria-label="Timeline assistant" className="drawer-in fixed z-40 right-3 bottom-3 top-3 w-[min(424px,calc(100vw-1.5rem))] glass border border-slate-200 rounded-2xl flex flex-col shadow-[0_30px_90px_-20px_rgb(0_0_0/0.95)]">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2.5">
            <span className={`orb w-7 h-7 ${thinking ? 'orb-live' : ''}`} />
            <div className="flex-1 min-w-0 leading-tight">
              <div className="font-display font-semibold text-slate-900">Timeline assistant</div>
              <div className="text-xs text-slate-500 truncate">{thinking ? 'Working…' : model ? `Answering with ${model}` : 'Ask for any change in your own words'}</div>
            </div>
            <button onClick={() => setOpen(false)} className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100" aria-label="Close the assistant" title="Close (Esc)"><X size={16} /></button>
          </div>

          <div ref={box} className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            {msgs.map((m, i) => m.who === 'me' ? (
              <div key={i} className="ml-auto w-fit max-w-[85%] bg-slate-200 text-slate-900 rounded-2xl rounded-br-md px-3.5 py-2 whitespace-pre-wrap rise">{m.text}</div>
            ) : (
              <div key={i} className="flex gap-3">
                <span className="orb w-6 h-6 shrink-0 mt-0.5" />
                <div className={`min-w-0 leading-relaxed ${m.error ? 'text-red-600' : 'text-slate-700'} ${typeof m.text === 'string' ? 'whitespace-pre-wrap' : ''}`}>
                  {m.stream && i === msgs.length - 1 ? <Typed text={m.text} onTick={toBottom} /> : m.text}
                  {m.tag && <div className="mt-2 text-xs inline-flex items-center gap-1.5 rounded-full border border-green-100 bg-green-50 text-green-700 px-2.5 py-1"><Check size={12} />{m.tag}</div>}
                </div>
              </div>
            ))}
            {q && !thinking && (
              <div className="flex gap-3 rise">
                <span className="orb w-6 h-6 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-slate-800"><span className="text-slate-400">{step + 1} of {QUESTIONS.length}</span><br />{q.text}</div>
                  {q.key === 'modMonths' ? (
                    <div className="mt-2.5 space-y-1.5">
                      {P.modules.map((md, i) => (
                        <label key={i} className="flex items-center justify-between gap-2 text-xs text-slate-600"><span className="truncate" title={md.name}>{md.name}</span>
                          <input type="number" min="0" step="0.5" placeholder="auto" value={mm[i] || ''} onChange={e => setMm({ ...mm, [i]: e.target.value })} className="w-20 shrink-0 border border-slate-200 rounded-lg px-2 py-1" /></label>
                      ))}
                    </div>
                  ) : q.hint && <div className="text-xs text-slate-400 mt-1">{q.hint}</div>}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {q.key === 'modMonths'
                      ? <button className={chip} onClick={() => { const o = {}; Object.entries(mm).forEach(([k, x]) => +x > 0 && (o[k] = +x)); answer('modMonths', o, Object.keys(o).length ? Object.entries(o).map(([k, x]) => `${P.modules[k].name}: ${x} months`).join(', ') : 'Skip') }}>Use these</button>
                      : q.opts.map(([l, val]) => <button key={l} onClick={() => answer(q.key, val, l)} className={chip}>{l}</button>)}
                    <button onClick={() => answer(q.key, q.key === 'modMonths' ? {} : null, 'Skip')} className={`${chip} !border-transparent !bg-transparent text-slate-500`}>Skip</button>
                  </div>
                </div>
              </div>
            )}
            {thinking && <Thinking steps={thinking === 'ai' ? THINK_AI : THINK_BUILD} />}
          </div>

          <div className="p-3 border-t border-slate-200">
            {v && !thinking && !q && (
              <div className="flex gap-1.5 overflow-x-auto pb-2.5 [scrollbar-width:none]">
                {['Make it 15% shorter', 'Fit it in 4 months', 'What are the risks in this plan?'].map(s => <button key={s} onClick={() => send(s)} className={`${chip} whitespace-nowrap`}>{s}</button>)}
              </div>
            )}
            <div className="flex items-end gap-2 border border-slate-300 focus-within:border-indigo-500 rounded-2xl bg-[#0b1130] pl-3.5 pr-1.5 py-1.5 transition">
              <textarea ref={input} rows={1} value={txt} aria-label="Message the assistant" placeholder={q ? 'Type an answer, or ask anything…' : 'Ask for a change or a question…'}
                onChange={e => { setTxt(e.target.value); e.target.style.height = ''; e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px' }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                className="flex-1 resize-none !bg-transparent !outline-none py-1.5 max-h-36 leading-snug" />
              <button onClick={() => send()} disabled={!txt.trim() || !!thinking} aria-label="Send" className="w-9 h-9 shrink-0 rounded-full rail text-ink grid place-items-center disabled:opacity-30 disabled:grayscale transition"><ArrowUp size={17} strokeWidth={2.5} /></button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 px-1">AI answers can be wrong. Check the dates before you save.</p>
          </div>
        </aside>
      )}
    </div>
  )
}
