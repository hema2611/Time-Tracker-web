import { team } from '../data/mock.js'
import { Card, Pill, PageHeader, Table, Kpi } from '../components/ui.jsx'

const COLORS = ['bg-indigo-500', 'bg-amber-500', 'bg-red-500', 'bg-orange-900']
const LABELS = ['Planned work', 'CR work', 'Bug fixing', 'Revert / rework']
const load = t => t.hours > 40 ? ['late', 'Overloaded'] : t.hours >= 35 || t.open >= 9 ? ['risk', 'High'] : ['ok', 'Normal']

export default function Team() {
  const total = team.reduce((a, t) => a + t.hours, 0)
  return (
    <>
      <PageHeader title="Team & workload" sub="Week of 16 – 22 Nov 2026 · hours come from each person's daily work log" />
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-5">
        <Kpi label="Team members" value={team.length} />
        <Kpi label="Hours logged this week" value={total} note={`avg ${Math.round(total / team.length)} per person`} />
        <Kpi label="Overloaded (> 40 hrs)" value={team.filter(t => t.hours > 40).length} tone="bad" note="Meena" />
        <Kpi label="Missed log days" value={team.reduce((a, t) => a + t.missed, 0)} tone="warn" note="Ravi 2, Karthik 1" />
      </div>
      <Card>
        <Table head={['Name', 'Role', 'Projects', 'Hours this week (of 40)', 'Where the hours went', 'Open items', 'Missed logs', 'Load']}>
          {team.map(t => {
            const [tone, text] = load(t)
            return (
              <tr key={t.name}>
                <td className="font-medium">{t.name}</td><td>{t.role}</td><td className="text-xs text-slate-500">{t.projects}</td>
                <td className="min-w-36">
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${t.hours > 40 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(t.hours / 40 * 100, 100)}%` }} /></div>
                  <span className="text-xs text-slate-500">{t.hours} hrs</span>
                </td>
                <td className="min-w-40">
                  <div className="flex h-2.5 rounded-full overflow-hidden">{t.split.map((v, i) => <div key={i} className={COLORS[i]} style={{ width: `${v / t.hours * 100}%` }} title={`${LABELS[i]}: ${v} hrs`} />)}</div>
                </td>
                <td>{t.open}</td>
                <td className={t.missed ? 'text-amber-600 font-medium' : 'text-slate-400'}>{t.missed || '–'}</td>
                <td><Pill tone={tone}>{text}</Pill></td>
              </tr>
            )
          })}
        </Table>
        <div className="flex flex-wrap gap-4 text-xs text-slate-500 p-3 border-t border-slate-100">
          {LABELS.map((l, i) => <span key={l} className="flex items-center gap-1.5"><i className={`w-2.5 h-2.5 rounded-sm ${COLORS[i]}`} />{l}</span>)}
          <span className="ml-auto">Load: Overloaded &gt; 40 hrs · High ≥ 35 hrs or ≥ 9 open items</span>
        </div>
      </Card>
    </>
  )
}
