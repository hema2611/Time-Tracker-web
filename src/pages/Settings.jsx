import { useState } from 'react'
import { Card, PageHeader, Button } from '../components/ui.jsx'

const Toggle = ({ on, onChange }) => (
  <button onClick={() => onChange(!on)} role="switch" aria-checked={on} className={`w-10 h-6 rounded-full relative transition shrink-0 ${on ? 'bg-indigo-600' : 'bg-slate-300'}`}>
    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${on ? 'left-5' : 'left-1'}`} />
  </button>
)

const Row = ({ title, desc, children }) => (
  <div className="flex items-center justify-between gap-6 py-4 border-b border-slate-100 last:border-0">
    <div><div className="font-medium">{title}</div><div className="text-xs text-slate-500 mt-0.5 max-w-xl">{desc}</div></div>
    {children}
  </div>
)

export default function Settings() {
  const [s, setS] = useState({ smallByTL: true, smallHours: 2, clientApproveAll: true, evidence: true, reasonOnReject: true, impactShown: true, reminderDays: 2, numbering: 'CR-{n}' })
  const [saved, setSaved] = useState(false)
  const set = (k, v) => { setS({ ...s, [k]: v }); setSaved(false) }

  return (
    <>
      <PageHeader title="Settings" sub="Change request (CR) approval rules" actions={<Button variant="primary" onClick={() => setSaved(true)}>Save changes</Button>} />
      {saved && <div className="bg-green-50 text-green-700 rounded-lg px-4 py-2.5 mb-4 font-medium">Settings saved.</div>}

      <Card className="px-5 max-w-3xl">
        <Row title="Client must approve every CR" desc="Work on a CR cannot start until a client approver clicks Approve. The approval is timestamped.">
          <Toggle on={s.clientApproveAll} onChange={v => set('clientApproveAll', v)} />
        </Row>
        <Row title="Small CRs can be approved by the team lead" desc="Saves time on tiny changes. They are still logged as CRs and shown to the client.">
          <div className="flex items-center gap-3">
            {s.smallByTL && <label className="text-xs text-slate-500 flex items-center gap-1.5">Up to <input type="number" min="0.5" step="0.5" value={s.smallHours} onChange={e => set('smallHours', e.target.value)} className="w-16 border border-slate-200 rounded px-2 py-1" /> hrs</label>}
            <Toggle on={s.smallByTL} onChange={v => set('smallByTL', v)} />
          </div>
        </Row>
        <Row title="Show timeline impact before approval" desc='Client sees "This moves go-live by +2 days" on the approve screen.'>
          <Toggle on={s.impactShown} onChange={v => set('impactShown', v)} />
        </Row>
        <Row title="Evidence required" desc="Every CR must have its source attached (email, WhatsApp screenshot, meeting).">
          <Toggle on={s.evidence} onChange={v => set('evidence', v)} />
        </Row>
        <Row title="Reason required to reject or cancel" desc="CRs are never deleted. A rejected or cancelled CR keeps its number and the reason.">
          <Toggle on={s.reasonOnReject} onChange={v => set('reasonOnReject', v)} />
        </Row>
        <Row title="Remind client about pending approvals" desc="Send a reminder if a CR waits this many days.">
          <label className="text-xs text-slate-500 flex items-center gap-1.5">After <input type="number" min="1" value={s.reminderDays} onChange={e => set('reminderDays', e.target.value)} className="w-14 border border-slate-200 rounded px-2 py-1" /> days</label>
        </Row>
        <Row title="CR numbering" desc="Numbered per project, never reused. Preview: CR-1, CR-2, CR-3…">
          <input value={s.numbering} onChange={e => set('numbering', e.target.value)} className="w-28 border border-slate-200 rounded px-2 py-1" />
        </Row>
      </Card>
      <p className="text-xs text-slate-400 mt-3">Working days and holidays: on hold.</p>
    </>
  )
}
