import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Check, FileUp, Sparkles, PencilLine } from 'lucide-react'
import { readProposal } from '../lib/readProposal.js'
import { api, apiUpload } from '../lib/api.js'
import { fromAi } from '../lib/proposal.js'
import TeamStep, { teamError } from '../components/TeamStep.jsx'
import { Card, PageHeader, Button, Input, Select } from '../components/ui.jsx'

const STEPS = ['Project details', 'Team & client users', 'Proposal (optional)']
const TYPES = [['fixed_scope', 'Fixed scope'], ['time_material', 'Time & material'], ['support', 'Support / AMC']]

export default function CreateProject() {
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [err, setErr] = useState('')
  const [d, setD] = useState({ name: '', client: '', start: '', type: 'fixed_scope', description: '', tlId: '', team: [], clients: [{ name: '', email: '', access: 'approver' }], file: null })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => { setD({ ...d, [k]: v }); setErr('') }
  const [how, setHow] = useState('ai') // 'ai' = draft the timeline with AI, 'own' = type it in yourself
  const [pdf, setPdf] = useState(null)
  const [savedId, setSavedId] = useState(null)
  const [stuck, setStuck] = useState('')
  const pick = f => {
    if (!/\.pdf$/i.test(f.name)) return setErr('Choose a PDF file.')
    if (f.size > 20 * 1024 * 1024) return setErr('The file is larger than 20 MB.')
    setPdf(f); setD(x => ({ ...x, file: f.name })); setErr('')
  }

  const next = async () => {
    if (step === 0 && (!d.name.trim() || !d.client.trim())) return setErr('Project name and client are required.')
    if (step === 1 && teamError(d)) return setErr(teamError(d))
    if (step === 2) {
      // The proposal is optional. Without one the AI has nothing to read, so the timeline is typed in by hand.
      // The project (and its proposal, if any) is saved here. The timeline on the next screen is not stored yet.
      setSaving(true); setStuck('')
      try {
        const { id } = savedId ? { id: savedId } : await api('/projects', { method: 'POST', body: {
          name: d.name, client: d.client, description: d.description || undefined, type: d.type, start: d.start || null,
          tlId: d.tlId, team: d.team, clients: d.clients.filter(c => c.email.trim()).map(c => ({ name: c.name.trim(), email: c.email.trim(), access: c.access })),
        } })
        setSavedId(id)
        sessionStorage.setItem('newProject', JSON.stringify({ id, name: d.name, client: d.client, start: d.start, file: d.file }))
        if (!pdf || how === 'own') {
          // Own timeline: the proposal (if any) is only stored, the AI is not called.
          const kept = pdf ? await apiUpload(`/projects/${id}/proposal?read=0`, pdf) : null
          sessionStorage.setItem('proposal', JSON.stringify({ file: pdf ? d.file : null, proposalId: kept ? kept.proposal.id : null, modules: [], outOfScope: [], manual: true }))
          return nav('/projects/new/timeline')
        }
        const up = await apiUpload(`/projects/${id}/proposal`, pdf)
        let proposal = up.reading && up.reading.modules.length ? fromAi(up.reading, up.proposal) : null, readBy = 'ai'
        if (!proposal) {
          // AI off, over its limit, failed, or found nothing: try the built-in reader before giving up.
          try { proposal = { ...await readProposal(pdf), proposalId: up.proposal.id }; readBy = 'rules' } catch { /* handled below */ }
        }
        if (!proposal) return setStuck(up.ai.status === 'ok' ? 'The AI could not find any modules or features in this document.' : up.ai.message)
        sessionStorage.setItem('proposal', JSON.stringify({ ...proposal, readBy, aiNote: readBy === 'rules' ? (up.ai.message || 'The AI found nothing, so the built-in reader was used.') : '' }))
        return nav('/projects/new/timeline')
      } catch (e) { setErr(e.message) } finally { setSaving(false) }
      return
    }
    setErr(''); setStep(step + 1)
  }

  return (
    <>
      <PageHeader title="New project" sub="Three quick steps, then the timeline." actions={<Link to="/projects/start"><Button>Back</Button></Link>} />

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {[...STEPS, 'Timeline'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full grid place-items-center text-xs font-semibold ${i < step ? 'bg-green-500 text-white' : i === step ? 'rail text-ink' : 'bg-slate-200 text-slate-500'}`}>{i < step ? <Check size={14} /> : i + 1}</div>
            <span className={i === step ? 'font-medium' : 'text-slate-500'}>{s}</span>
            {i < 3 && <span className="w-8 h-px bg-slate-300 mx-1" />}
          </div>
        ))}
      </div>

      <Card className="p-6">
        {step === 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Project name *" value={d.name} onChange={e => set('name', e.target.value)} placeholder="e.g. HR & Payroll system" />
            <Input label="Client company *" value={d.client} onChange={e => set('client', e.target.value)} placeholder="e.g. Acme Retail" />
            <Input label="Planned start date" type="date" value={d.start} onChange={e => set('start', e.target.value)} hint="Optional – the timeline assistant asks again" />
            <label className="block"><span className="block text-xs font-medium text-slate-600 mb-1">Project type</span>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white" value={d.type} onChange={e => set('type', e.target.value)}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label className="md:col-span-2 block"><span className="block text-xs font-medium text-slate-600 mb-1">Short description</span>
              <textarea rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2" placeholder="What the project is about" value={d.description} onChange={e => set('description', e.target.value)} /></label>
          </div>
        )}

        {step === 1 && <TeamStep d={d} set={set} />}

        {step === 2 && (
          <div>
            {!d.file ? (
              <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/40 rounded-xl p-10 text-center">
                <FileUp className="mx-auto text-indigo-500" />
                <div className="font-medium mt-2">Upload the signed proposal <span className="text-slate-500 font-normal">(optional)</span></div>
                <div className="text-xs text-slate-500 mt-1 mb-4">PDF, up to 20 MB. It is stored with the project as Proposal v1. No proposal? Skip this and type the timeline yourself.</div>
                <div className="flex gap-2 justify-center flex-wrap">
                  <label className="cursor-pointer"><span className="rounded-xl px-4 py-2 font-medium rail text-ink hover:brightness-110 inline-block">Choose file</span>
                    <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={e => { e.target.files[0] && pick(e.target.files[0]); e.target.value = '' }} /></label>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-3"><FileUp className="text-indigo-500" /><div><div className="font-medium">{d.file}</div><div className="text-xs text-slate-500">{pdf ? `${(pdf.size / 1024 / 1024).toFixed(1)} MB, stored when you save the project` : ''}</div></div></div>
                <Button variant="ghost" onClick={() => { setPdf(null); set('file', null) }}>Replace</Button>
              </div>
            )}

            {pdf && <fieldset className="mt-6">
              <legend className="font-medium text-slate-900 mb-1">How do you want to make the timeline?</legend>
              <p className="text-xs text-slate-500 mb-3">You can edit everything on the next screen either way.</p>
              <div className="grid gap-3 md:grid-cols-2">
                {[['ai', Sparkles, 'Draft it with AI', 'AI reads the proposal and drafts the modules, sections and dates. You review and correct it.'],
                  ['own', PencilLine, 'I have my own timeline', 'The proposal is only stored. You type in the modules, sections and days yourself. No AI is used.']].map(([k, Icon, title, text]) => (
                  <label key={k} className={`flex gap-3 rounded-2xl border p-4 cursor-pointer transition ${how === k ? 'border-indigo-500 bg-indigo-50/60 shadow-[0_0_30px_-14px_#5ee6ff]' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" name="how" value={k} checked={how === k} onChange={() => setHow(k)} className="sr-only" />
                    <span className={`w-10 h-10 shrink-0 rounded-xl grid place-items-center ${how === k ? 'rail text-ink' : 'bg-slate-100 text-slate-500'}`}><Icon size={18} /></span>
                    <span><span className="block font-medium text-slate-900">{title}</span><span className="block text-xs text-slate-500 mt-0.5">{text}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>}
          </div>
        )}

        {err && <p className="text-red-600 text-xs mt-4" role="alert">{err}</p>}
        {stuck && <div className="bg-amber-50 text-amber-800 rounded-lg px-4 py-3 mt-4" role="alert">The project and proposal are saved, but the timeline could not be drafted: {stuck} <Link to="/projects" className="underline font-medium">Go to projects</Link></div>}
        <div className="flex justify-between mt-6 pt-4 border-t border-slate-100">
          <Button disabled={step === 0} onClick={() => { setStep(step - 1); setErr('') }}>Back</Button>
          <Button variant="primary" onClick={next} disabled={saving}>{saving ? (pdf && how === 'ai' ? 'Saving and reading the proposal…' : 'Saving…') : step === 2 ? (pdf && how === 'ai' ? 'Save project and draft timeline' : pdf ? 'Save project and enter timeline' : 'Skip proposal, save project and enter timeline') : 'Next'}</Button>
        </div>
      </Card>
    </>
  )
}
