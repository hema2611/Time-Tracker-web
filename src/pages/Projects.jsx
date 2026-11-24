import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LayoutGrid, List, Plus } from 'lucide-react'
import { api, fmtDate } from '../lib/api.js'
import { fromAi } from '../lib/proposal.js'
import { useAuth } from '../auth.jsx'
import { Card, Pill, PageHeader, Button, Table } from '../components/ui.jsx'

const TABS = [['active', 'Active'], ['completed', 'Completed'], ['all', 'All']]
const STATUS = { active: ['ok', 'Active'], completed: ['done', 'Completed'], on_hold: ['risk', 'On hold'] }
const TYPE = { fixed_scope: 'Fixed scope', time_material: 'Time & material', support: 'Support / AMC' }

export default function Projects() {
  const { user } = useAuth()
  const [projects, setProjects] = useState(null)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState('active')
  const [view, setView] = useState('cards')
  const [q, setQ] = useState('')
  const nav = useNavigate()
  const [busyId, setBusyId] = useState(null)
  const [note, setNote] = useState('')
  // For a project that has a proposal but no timeline yet: read the stored proposal again and open the timeline screen.
  const buildTimeline = async p => {
    setBusyId(p.id); setNote('')
    try {
      const r = await api(`/projects/${p.id}/proposal/read`, { method: 'POST' })
      if (!r.reading?.modules.length) return setNote(`${p.name}: ${r.ai.status === 'ok' ? 'the AI could not find any work items in the stored proposal.' : r.ai.message}`)
      sessionStorage.setItem('proposal', JSON.stringify({ ...fromAi(r.reading, r.proposal), readBy: 'ai' }))
      sessionStorage.setItem('newProject', JSON.stringify({ id: p.id, name: p.name, client: p.client, start: p.start || '', file: r.proposal.fileName }))
      nav('/projects/new/timeline')
    } catch (e) { setNote(`${p.name}: ${e.message}`) } finally { setBusyId(null) }
  }

  useEffect(() => { api('/projects').then(d => setProjects(d.projects)).catch(e => setErr(e.message)) }, [])

  const all = projects || []
  const list = all.filter(p => (tab === 'all' || p.status === tab) && (p.name + p.client + p.tl).toLowerCase().includes(q.toLowerCase()))
  const count = s => all.filter(p => p.status === s).length

  return (
    <>
      <PageHeader title="Projects" sub={projects ? `${count('active')} active · ${count('completed')} completed` : ' '}
        actions={user.role === 'admin' && <Link to="/projects/start"><Button variant="primary" className="flex items-center gap-1.5"><Plus size={15} />New project</Button></Link>} />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
          {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-3 py-1 rounded-md ${tab === k ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{l}</button>)}
        </div>
        <div className="flex gap-2 items-center">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter by name, client, TL" className="border border-slate-200 rounded-lg px-3 py-1.5 bg-white" />
          <Button variant={view === 'cards' ? 'primary' : 'default'} onClick={() => setView('cards')} aria-label="Card view"><LayoutGrid size={15} /></Button>
          <Button variant={view === 'table' ? 'primary' : 'default'} onClick={() => setView('table')} aria-label="Table view"><List size={15} /></Button>
        </div>
      </div>

      {note && <div className="bg-amber-50 text-amber-800 rounded-lg px-4 py-2.5 mb-4" role="alert">{note}</div>}
      {err && <Card className="p-6 text-red-600">{err}</Card>}
      {!err && !projects && <Card className="p-10 text-center text-slate-400">Loading projects…</Card>}
      {projects && list.length === 0 && (
        <Card className="p-10 text-center text-slate-400">
          {all.length === 0 ? (user.role === 'admin' ? 'No projects yet. Use "New project" to add the first one.' : 'You are not on any project yet.') : 'No projects match.'}
        </Card>
      )}

      {view === 'cards' ? (
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
          {list.map(p => (
            <Card key={p.id} className="p-4">
              <div className="flex justify-between gap-2"><Link to={`/projects/${p.id}`} className="font-semibold text-slate-900 hover:text-indigo-700">{p.name}</Link><Pill tone={STATUS[p.status][0]}>{STATUS[p.status][1]}</Pill></div>
              <div className="text-xs text-slate-500 mt-1">{p.client} · TL {p.tl}</div>
              <dl className="grid grid-cols-2 gap-y-2 mt-4 text-xs">
                <dt className="text-slate-500">Type</dt><dd className="text-right">{TYPE[p.type]}</dd>
                <dt className="text-slate-500">Start</dt><dd className="text-right">{fmtDate(p.start)}</dd>
                <dt className="text-slate-500">Go-live</dt><dd className="text-right">{p.golive ? fmtDate(p.golive) : 'No timeline yet'}</dd>
              </dl>
              {user.role === 'admin' && !p.golive && <Button className="mt-4 w-full" disabled={busyId === p.id} onClick={() => buildTimeline(p)}>{busyId === p.id ? 'Reading the proposal…' : 'Build timeline from proposal'}</Button>}
            </Card>
          ))}
        </div>
      ) : list.length > 0 && (
        <Card><Table head={['Project', 'Client', 'TL', 'Type', 'Start', 'Go-live', 'Status']}>
          {list.map(p => (
            <tr key={p.id}>
              <td className="font-medium">{p.name}</td><td>{p.client}</td><td>{p.tl}</td><td>{TYPE[p.type]}</td>
              <td>{fmtDate(p.start)}</td><td>{p.golive ? fmtDate(p.golive) : 'No timeline yet'}</td>
              <td><Pill tone={STATUS[p.status][0]}>{STATUS[p.status][1]}</Pill></td>
            </tr>
          ))}
        </Table></Card>
      )}
    </>
  )
}
