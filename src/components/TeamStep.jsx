import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { api, ROLE_LABEL } from '../lib/api.js'
import { Button } from './ui.jsx'

// Team step of the new-project wizard. d.tlId and d.team hold user ids from the backend.
export default function TeamStep({ d, set }) {
  const [staff, setStaff] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => { api('/projects/options/staff').then(x => setStaff(x.staff)).catch(e => setErr(e.message)) }, [])

  const setClient = (i, k, v) => set('clients', d.clients.map((x, j) => j === i ? { ...x, [k]: v } : x))
  if (err) return <p className="text-red-600">{err}</p>
  if (!staff) return <p className="text-slate-400">Loading team…</p>
  const leads = staff.filter(u => u.role === 'tl'), others = staff.filter(u => u.role !== 'tl' && u.role !== 'admin')

  return (
    <div className="space-y-6">
      <label className="block max-w-xs">
        <span className="block text-xs font-medium text-slate-600 mb-1">Team lead *</span>
        <select className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white" value={d.tlId} onChange={e => set('tlId', +e.target.value || '')}>
          <option value="">Choose a team lead</option>
          {leads.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        {!leads.length && <span className="block text-xs text-amber-700 mt-1">No team leads yet. Add one under Users &amp; roles first.</span>}
      </label>
      <div>
        <div className="text-xs font-medium text-slate-600 mb-2">Team members *</div>
        {!others.length && <p className="text-xs text-amber-700">No developers, designers or testers yet. Add them under Users &amp; roles first.</p>}
        <div className="flex flex-wrap gap-2">
          {others.map(u => {
            const on = d.team.includes(u.id)
            return <button type="button" key={u.id} aria-pressed={on} onClick={() => set('team', on ? d.team.filter(x => x !== u.id) : [...d.team, u.id])}
              className={`px-3 py-1.5 rounded-full border ${on ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>{u.name} <span className={on ? 'text-indigo-200' : 'text-slate-400'}>· {ROLE_LABEL[u.role]}</span></button>
          })}
        </div>
      </div>
      <div>
        <div className="text-xs font-medium text-slate-600 mb-2">Client users <span className="text-slate-400 font-normal">(optional. They can sign in after you set a password for them under Users &amp; roles)</span></div>
        {d.clients.map((c, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_140px_32px] gap-2 mb-2">
            <input className="border border-slate-200 rounded-lg px-3 py-2" placeholder="Name" value={c.name} onChange={e => setClient(i, 'name', e.target.value)} />
            <input className="border border-slate-200 rounded-lg px-3 py-2" placeholder="Email" value={c.email} onChange={e => setClient(i, 'email', e.target.value)} />
            <select className="border border-slate-200 rounded-lg px-2 bg-white" value={c.access} onChange={e => setClient(i, 'access', e.target.value)}><option value="approver">Approver</option><option value="viewer">Viewer</option></select>
            <button type="button" aria-label="Remove" className="text-slate-400" onClick={() => set('clients', d.clients.filter((_, j) => j !== i))}><X size={16} /></button>
          </div>
        ))}
        <Button variant="ghost" onClick={() => set('clients', [...d.clients, { name: '', email: '', access: 'viewer' }])}>+ Add client user</Button>
      </div>
    </div>
  )
}

export const teamError = d =>
  !d.tlId ? 'Choose a team lead.'
    : !d.team.length ? 'Pick at least one team member.'
    : d.clients.some(c => (c.name.trim() || c.email.trim()) && !(c.name.trim() && /^\S+@\S+\.\S+$/.test(c.email.trim()))) ? 'Each client user needs a name and a valid email.' : ''
