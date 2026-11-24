import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Check, FileUp, FileSpreadsheet, Plus, X, Info } from 'lucide-react'
import { Card, PageHeader, Button, Input, Select, Pill } from '../components/ui.jsx'
import TeamStep, { teamError } from '../components/TeamStep.jsx'

const STEPS = ['Project details', 'Team & client users', 'Current plan', 'Past changes', 'Review']
const STATUS = ['Done', 'In progress', 'Not started']
const TONE = { Done: 'ok', 'In progress': 'info', 'Not started': 'neutral' }
const today = new Date().toISOString().slice(0, 10)

// Sample fills – in the real tool these come from AI (proposal) or the uploaded Excel.
const FROM_PROPOSAL = [
  { mod: true, name: 'Employees module' },
  { name: 'Employee master', status: 'Not started', pct: 0 }, { name: 'Attendance', status: 'Not started', pct: 0 }, { name: 'Leave management', status: 'Not started', pct: 0 },
  { mod: true, name: 'Payroll module' },
  { name: 'Salary structure', status: 'Not started', pct: 0 }, { name: 'Payroll run', status: 'Not started', pct: 0 },
]
const FROM_EXCEL = [
  { mod: true, name: 'Employees module' },
  { name: 'Employee master', status: 'Done', aStart: '2026-09-01', aEnd: '2026-09-19', pct: 100 },
  { name: 'Attendance', status: 'Done', aStart: '2026-09-22', aEnd: '2026-10-17', pct: 100 },
  { name: 'Leave management', status: 'In progress', aStart: '2026-10-20', planEnd: '2026-11-28', pct: 60 },
  { mod: true, name: 'Payroll module' },
  { name: 'Salary structure', status: 'Not started', planEnd: '2026-12-19', pct: 0 },
  { name: 'Payroll run', status: 'Not started', planEnd: '2027-01-23', pct: 0 },
]
const PAST_CRS = [
  { title: 'Add late-mark rule to attendance', date: '2026-10-02', status: 'Done' },
  { title: 'Revert attendance colour change', date: '2026-10-09', status: 'Done' },
  { title: 'Payroll: add overtime column', date: '2026-11-04', status: 'Approved' },
]

const fmt = s => s ? new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '–'

export default function ExistingProject() {
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [err, setErr] = useState('')
  const [d, setD] = useState({ name: '', client: '', actualStart: '', phase: '', trackFrom: today, tl: 'Arun', team: [], clients: [{ name: '', email: '', access: 'Approver' }], file: null, rows: [], crs: [], baseline: 'current' })
  const set = (k, v) => { setD(x => ({ ...x, [k]: v })); setErr('') }
  const setRow = (i, k, v) => set('rows', d.rows.map((r, j) => {
    if (j !== i) return r
    const n = { ...r, [k]: v }
    if (k === 'status') n.pct = v === 'Done' ? 100 : v === 'Not started' ? 0 : (r.pct > 0 && r.pct < 100 ? r.pct : 50)
    return n
  }))
  const sections = d.rows.filter(r => !r.mod)

  const check = () => {
    if (step === 0) {
      if (!d.name.trim() || !d.client.trim()) return 'Project name and client are required.'
      if (!d.actualStart) return 'Enter when the project actually started.'
      if (d.trackFrom < d.actualStart) return '"Tracking starts from" cannot be before the project start.'
    }
    if (step === 1) return teamError(d)
    if (step === 2) {
      if (!sections.length) return 'Add at least one section, or fill the plan from the proposal or Excel.'
      const bad = sections.find(r => !r.name.trim() || (r.status === 'Done' && !r.aEnd) || (r.status !== 'Done' && !r.planEnd))
      if (bad) return `"${bad.name || 'Unnamed section'}": ${bad.status === 'Done' ? 'finished work needs an actual end date' : 'needs a planned finish date'}.`
    }
    if (step === 3 && d.crs.some(c => !c.title.trim())) return 'Every past change needs a title, or remove the empty row.'
    return ''
  }
  const next = () => {
    const e = check(); if (e) return setErr(e)
    if (step === 4) {
      const done = sections.filter(r => r.status === 'Done').length
      const pct = Math.round(sections.reduce((a, r) => a + (+r.pct || 0), 0) / sections.length)
      const finish = sections.map(r => r.planEnd || r.aEnd).sort().pop()
      const list = JSON.parse(sessionStorage.getItem('onboarded') || '[]')
      list.unshift({ id: 'on' + Date.now(), name: d.name, client: d.client, tl: d.tl, phase: d.phase || `${done} of ${sections.length} sections done`, progress: pct, health: 'ok', healthText: 'Onboarded', openCR: d.crs.filter(c => c.status !== 'Done').length, reverts: d.crs.filter(c => /revert/i.test(c.title)).length, clientPending: 0, start: fmt(d.actualStart), golive: fmt(finish), baseline: fmt(finish), status: 'Active', onboarded: true, trackFrom: fmt(d.trackFrom) })
      sessionStorage.setItem('onboarded', JSON.stringify(list))
      return nav('/projects')
    }
    setErr(''); setStep(step + 1)
  }

  return (
    <>
      <PageHeader title="Add existing project" sub="Record where the project stands today. Nothing before the tracking date needs to be perfect."
        actions={<Link to="/projects/start"><Button>Back</Button></Link>} />

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full grid place-items-center text-xs font-semibold ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{i < step ? <Check size={14} /> : i + 1}</div>
            <span className={i === step ? 'font-medium' : 'text-slate-500'}>{s}</span>
            {i < STEPS.length - 1 && <span className="w-6 h-px bg-slate-300 mx-1" />}
          </div>
        ))}
      </div>

      <Card className="p-6">
        {step === 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Project name *" value={d.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Retail ERP" />
            <Input label="Client company *" value={d.client} onChange={e => set('client', e.target.value)} placeholder="e.g. Acme Retail" />
            <Input label="Project actually started on *" type="date" value={d.actualStart} max={today} onChange={e => set('actualStart', e.target.value)} />
            <Input label="Current phase" value={d.phase} onChange={e => set('phase', e.target.value)} placeholder="e.g. Phase 1 – Development" hint="Optional" />
            <Input label="Tracking starts from *" type="date" value={d.trackFrom} onChange={e => set('trackFrom', e.target.value)} hint="Everything after this date is tracked live. Before it, history is partial." />
          </div>
        )}

        {step === 1 && <TeamStep d={d} set={set} />}

        {step === 2 && (
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              <Button className="flex items-center gap-1.5" onClick={() => { set('rows', FROM_PROPOSAL.map(r => ({ ...r }))); set('file', 'Proposal_RetailERP_v1.pdf') }}><FileUp size={15} />Draft from proposal</Button>
              <Button className="flex items-center gap-1.5" onClick={() => set('rows', FROM_EXCEL.map(r => ({ ...r })))}><FileSpreadsheet size={15} />Fill from Excel</Button>
              <Button variant="ghost" className="flex items-center gap-1.5" onClick={() => set('rows', [...d.rows, { mod: true, name: 'New module' }, { name: '', status: 'Not started', pct: 0 }])}><Plus size={15} />Add module</Button>
              <span className="text-xs text-slate-400 self-center">Sample data in this prototype</span>
            </div>
            {d.file && <div className="text-xs text-slate-500 mb-3">Proposal attached: <b>{d.file}</b>. The sections were drafted from it, so set the status of each one.</div>}

            {!d.rows.length ? (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center text-slate-400">Pick a way to fill the plan above, or add a module and type it in.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="text-left text-xs text-slate-500">{['Module / section', 'Status', 'Actual start', 'Actual end', 'Planned finish', '% done', ''].map(h => <th key={h} className="px-2 py-2 border-b border-slate-200 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
                  <tbody>
                    {d.rows.map((r, i) => r.mod ? (
                      <tr key={i} className="bg-slate-50">
                        <td className="px-2 py-1.5 border-b border-slate-100" colSpan={6}><input value={r.name} onChange={e => setRow(i, 'name', e.target.value)} className="font-semibold bg-transparent w-full px-2 py-1 rounded border border-transparent hover:border-slate-200 focus:border-indigo-300 outline-none" /></td>
                        <td className="px-2 border-b border-slate-100 text-right whitespace-nowrap">
                          <Button variant="ghost" className="text-xs" onClick={() => { const rows = [...d.rows]; let j = i + 1; while (j < rows.length && !rows[j].mod) j++; rows.splice(j, 0, { name: '', status: 'Not started', pct: 0 }); set('rows', rows) }}>+ section</Button>
                          <button aria-label="Remove module" className="text-slate-300 hover:text-red-500" onClick={() => { const rows = [...d.rows]; let j = i + 1; while (j < rows.length && !rows[j].mod) j++; rows.splice(i, j - i); set('rows', rows) }}><X size={15} /></button>
                        </td>
                      </tr>
                    ) : (
                      <tr key={i}>
                        <td className="px-2 py-1.5 border-b border-slate-100 pl-6 min-w-44"><input value={r.name} placeholder="Section name" onChange={e => setRow(i, 'name', e.target.value)} className="w-full px-2 py-1 rounded border border-slate-200" /></td>
                        <td className="px-2 py-1.5 border-b border-slate-100">
                          <select value={r.status} onChange={e => setRow(i, 'status', e.target.value)} className="border border-slate-200 rounded px-2 py-1 bg-white">{STATUS.map(s => <option key={s}>{s}</option>)}</select>
                        </td>
                        <td className="px-2 py-1.5 border-b border-slate-100">{r.status !== 'Not started' ? <input type="date" value={r.aStart || ''} onChange={e => setRow(i, 'aStart', e.target.value)} className="border border-slate-200 rounded px-2 py-1" /> : <span className="text-slate-300">–</span>}</td>
                        <td className="px-2 py-1.5 border-b border-slate-100">{r.status === 'Done' ? <input type="date" value={r.aEnd || ''} onChange={e => setRow(i, 'aEnd', e.target.value)} className="border border-slate-200 rounded px-2 py-1" /> : <span className="text-slate-300">–</span>}</td>
                        <td className="px-2 py-1.5 border-b border-slate-100">{r.status !== 'Done' ? <input type="date" value={r.planEnd || ''} onChange={e => setRow(i, 'planEnd', e.target.value)} className="border border-slate-200 rounded px-2 py-1" /> : <span className="text-slate-300">–</span>}</td>
                        <td className="px-2 py-1.5 border-b border-slate-100 w-24">{r.status === 'In progress' ? <input type="number" min="1" max="99" value={r.pct} onChange={e => setRow(i, 'pct', Math.max(1, Math.min(99, +e.target.value)))} className="w-16 border border-slate-200 rounded px-2 py-1" /> : <Pill tone={TONE[r.status]}>{r.pct}%</Pill>}</td>
                        <td className="px-2 border-b border-slate-100 text-right"><button aria-label="Remove section" className="text-slate-300 hover:text-red-500" onClick={() => set('rows', d.rows.filter((_, j) => j !== i))}><X size={15} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="text-slate-600 mb-1">Add changes that happened before tracking started. This is optional: skip it and start fresh.</p>
            <p className="text-xs text-slate-400 mb-4">They get CR numbers and are tagged <Pill tone="risk">Imported</Pill>, so everyone knows they weren't tracked live.</p>
            <div className="flex gap-2 mb-3">
              <Button className="flex items-center gap-1.5" onClick={() => set('crs', [...d.crs, ...PAST_CRS.map(c => ({ ...c }))])}><FileSpreadsheet size={15} />Import from Excel</Button>
              <Button variant="ghost" className="flex items-center gap-1.5" onClick={() => set('crs', [...d.crs, { title: '', date: '', status: 'Done' }])}><Plus size={15} />Add one</Button>
            </div>
            {d.crs.length > 0 && (
              <table className="w-full">
                <thead><tr className="text-left text-xs text-slate-500">{['No.', 'What was changed', 'Approx. date', 'Status', ''].map(h => <th key={h} className="px-2 py-2 border-b border-slate-200 font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {d.crs.map((c, i) => {
                    const up = (k, v) => set('crs', d.crs.map((x, j) => j === i ? { ...x, [k]: v } : x))
                    return (
                      <tr key={i}>
                        <td className="px-2 py-1.5 border-b border-slate-100 font-medium whitespace-nowrap">CR-{i + 1}</td>
                        <td className="px-2 py-1.5 border-b border-slate-100"><input value={c.title} onChange={e => up('title', e.target.value)} placeholder="e.g. Add discount column" className="w-full border border-slate-200 rounded px-2 py-1" /></td>
                        <td className="px-2 py-1.5 border-b border-slate-100"><input type="date" value={c.date} onChange={e => up('date', e.target.value)} className="border border-slate-200 rounded px-2 py-1" /></td>
                        <td className="px-2 py-1.5 border-b border-slate-100"><select value={c.status} onChange={e => up('status', e.target.value)} className="border border-slate-200 rounded px-2 py-1 bg-white">{['Done', 'Approved', 'In progress', 'Rejected'].map(s => <option key={s}>{s}</option>)}</select></td>
                        <td className="px-2 py-1.5 border-b border-slate-100 text-right"><button aria-label="Remove" className="text-slate-300 hover:text-red-500" onClick={() => set('crs', d.crs.filter((_, j) => j !== i))}><X size={15} /></button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {step === 4 && (() => {
          const by = s => sections.filter(r => r.status === s).length
          const pct = Math.round(sections.reduce((a, r) => a + (+r.pct || 0), 0) / sections.length)
          return (
            <div className="space-y-5">
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                {[['Project', d.name], ['Client', d.client], ['Started', fmt(d.actualStart)], ['Tracking from', fmt(d.trackFrom)]].map(([l, v]) => <div key={l} className="bg-slate-50 rounded-lg p-3"><div className="text-xs text-slate-500">{l}</div><div className="font-semibold mt-0.5">{v}</div></div>)}
              </div>
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                {[['Overall progress', `${pct}%`], ['Sections done', by('Done')], ['In progress', by('In progress')], ['Not started', by('Not started')]].map(([l, v]) => <div key={l} className="border border-slate-200 rounded-lg p-3"><div className="text-xs text-slate-500">{l}</div><div className="text-lg font-semibold mt-0.5">{v}</div></div>)}
              </div>
              <div className="text-slate-600">Team: <b>{d.tl}</b> (TL), {d.team.join(', ')} · Past changes imported: <b>{d.crs.length}</b>{d.file && <> · Proposal: <b>{d.file}</b></>}</div>
              <div>
                <div className="font-medium mb-2">What should delays be measured against?</div>
                {[['current', "Today's plan becomes the baseline (recommended)", 'Delays are measured from now on. Delays before onboarding are not counted.'],
                  ['original', 'I will enter the original planned dates later', "Until then, the project shows 'Baseline missing' and no delay is calculated."]].map(([k, t, s]) => (
                  <label key={k} className={`flex gap-3 border rounded-lg p-3 mb-2 cursor-pointer ${d.baseline === k ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200'}`}>
                    <input type="radio" name="baseline" checked={d.baseline === k} onChange={() => set('baseline', k)} className="mt-1" />
                    <span><span className="font-medium">{t}</span><span className="block text-xs text-slate-500 mt-0.5">{s}</span></span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2 bg-amber-50 text-amber-800 rounded-lg p-3 text-[13px]"><Info size={16} className="shrink-0 mt-0.5" />History before {fmt(d.trackFrom)} is partial. The project card will show an “Onboarded” tag with this date.</div>
            </div>
          )
        })()}

        {err && <p className="text-red-600 text-xs mt-4">{err}</p>}
        <div className="flex justify-between mt-6 pt-4 border-t border-slate-100">
          <Button disabled={step === 0} onClick={() => { setStep(step - 1); setErr('') }}>Back</Button>
          <div className="flex gap-2">
            {step === 3 && !d.crs.length && <Button variant="ghost" onClick={() => setStep(4)}>Skip</Button>}
            <Button variant={step === 4 ? 'success' : 'primary'} onClick={next}>{step === 4 ? 'Add project' : 'Next'}</Button>
          </div>
        </div>
      </Card>
    </>
  )
}
