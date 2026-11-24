import { Link } from 'react-router-dom'
import { FilePlus2, FolderInput } from 'lucide-react'
import { Card, PageHeader, Button } from '../components/ui.jsx'

const OPTIONS = [
  { to: '/projects/new', icon: FilePlus2, title: 'Start a new project', points: ['Work has not started yet', 'Upload the signed proposal', 'Timeline is generated from the proposal'] },
  { to: null, icon: FolderInput, title: 'Add an existing project', points: ['Work is already running', 'Enter where it stands today: done / in progress / not started', 'Proposal and old changes are optional'] },
]

export default function ProjectStart() {
  return (
    <>
      <PageHeader title="Add project" sub="Is this a brand-new project, or one that is already running?" actions={<Link to="/projects"><Button>Cancel</Button></Link>} />
      <div className="grid gap-4 md:grid-cols-2">
        {OPTIONS.map(o => (
          <Link key={o.title} to={o.to || '#'} aria-disabled={!o.to} onClick={e => !o.to && e.preventDefault()} className={o.to ? '' : 'cursor-not-allowed'}>
            <Card className={`p-6 h-full transition ${o.to ? 'hover:border-indigo-400' : 'opacity-60'}`}>
              {!o.to && <div className="float-right text-xs bg-amber-100 text-amber-800 rounded-full px-2 py-0.5">Not connected yet</div>}
              <o.icon className="text-indigo-600" />
              <div className="font-semibold text-base mt-3">{o.title}</div>
              <ul className="mt-3 space-y-1.5 text-slate-600">{o.points.map(p => <li key={p}>• {p}</li>)}</ul>
            </Card>
          </Link>
        ))}
      </div>
    </>
  )
}
