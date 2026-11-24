import { useState } from 'react'
import { rework, clientResponse, delays } from '../data/mock.js'
import { Card, Pill, PageHeader, Table, Kpi, Select } from '../components/ui.jsx'

const COLORS = ['bg-indigo-500', 'bg-amber-500', 'bg-red-500', 'bg-orange-900']
const LABELS = ['Planned work', 'CR work', 'Bug fixing', 'Revert / rework']
const TABS = [['rework', 'Rework'], ['client', 'Client response'], ['delays', 'Delays']]

export default function Reports() {
  const [tab, setTab] = useState('rework')
  const tot = rework.reduce((a, r) => a.map((x, i) => x + r.hours[i]), [0, 0, 0, 0])
  const all = tot.reduce((a, b) => a + b, 0)

  return (
    <>
      <PageHeader title="Reports" sub="For HR and management"
        actions={<><Select options={['November 2026', 'October 2026', 'Last 3 months']} className="w-44" /><button className="border border-slate-200 bg-white rounded-lg px-3 py-1.5 font-medium">Export Excel</button></>} />

      <div className="flex gap-1 border-b border-slate-200 mb-5">
        {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 -mb-px border-b-2 ${tab === k ? 'border-indigo-600 text-indigo-700 font-medium' : 'border-transparent text-slate-500'}`}>{l}</button>)}
      </div>

      {tab === 'rework' && (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-5">
            <Kpi label="Total hours logged" value={all} />
            <Kpi label="CR work" value={`${tot[1]} hrs`} note={`${Math.round(tot[1] / all * 100)}% of time`} tone="warn" />
            <Kpi label="Bug fixing" value={`${tot[2]} hrs`} note={`${Math.round(tot[2] / all * 100)}% of time`} tone="bad" />
            <Kpi label="Reverts (client rework)" value={`${tot[3]} hrs`} note={`${rework.reduce((a, r) => a + r.reverts, 0)} reverted CRs`} tone="bad" />
          </div>
          <div className="bg-indigo-50 text-indigo-900 rounded-lg px-4 py-2.5 mb-4 text-[13px]">Reverts and reopens tagged “requirement changed” count as <b>client rework</b>. Reopens tagged “bug” count as <b>team rework</b>.</div>
          <Card>
            <Table head={['Project', 'Client', 'Where the hours went', 'Planned', 'CR', 'Bug fix', 'Revert', 'Client reverts', 'Team bugs reopened']}>
              {rework.map(r => {
                const t = r.hours.reduce((a, b) => a + b, 0)
                return (
                  <tr key={r.project}>
                    <td className="font-medium">{r.project}</td><td>{r.client}</td>
                    <td className="min-w-48"><div className="flex h-3 rounded-full overflow-hidden">{r.hours.map((h, i) => <div key={i} className={COLORS[i]} style={{ width: `${h / t * 100}%` }} title={`${LABELS[i]}: ${h} hrs`} />)}</div></td>
                    {r.hours.map((h, i) => <td key={i}>{h}</td>)}
                    <td className={r.reverts ? 'text-red-600 font-medium' : ''}>{r.reverts}</td>
                    <td className={r.bugsReopened ? 'text-amber-600 font-medium' : ''}>{r.bugsReopened}</td>
                  </tr>
                )
              })}
            </Table>
            <div className="flex flex-wrap gap-4 text-xs text-slate-500 p-3 border-t border-slate-100">{LABELS.map((l, i) => <span key={l} className="flex items-center gap-1.5"><i className={`w-2.5 h-2.5 rounded-sm ${COLORS[i]}`} />{l}</span>)}</div>
          </Card>
        </>
      )}

      {tab === 'client' && (
        <Card>
          <Table head={['Client', 'Avg. time to approve a CR', 'Avg. meetings to verify a batch', 'MOMs confirmed on time', 'Rating']}>
            {clientResponse.map(c => {
              const tone = c.crApproval > 4 || c.momOnTime < 50 ? 'late' : c.crApproval > 2.5 || c.momOnTime < 80 ? 'risk' : 'ok'
              return (
                <tr key={c.client}>
                  <td className="font-medium">{c.client}</td><td>{c.crApproval} days</td><td>{c.verify}</td>
                  <td className="min-w-40"><div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${c.momOnTime < 50 ? 'bg-red-500' : c.momOnTime < 80 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${c.momOnTime}%` }} /></div><span className="text-xs text-slate-500">{c.momOnTime}%</span></td>
                  <td><Pill tone={tone}>{tone === 'ok' ? 'Responsive' : tone === 'risk' ? 'Slow' : 'Very slow'}</Pill></td>
                </tr>
              )
            })}
          </Table>
          <p className="text-xs text-slate-400 p-3">Slow client responses are counted as client wait, not team delay.</p>
        </Card>
      )}

      {tab === 'delays' && (
        <Card>
          <Table head={['Project', 'Milestone', 'Planned', 'Now', 'Total delay', 'From CRs (client)', 'Client waiting', 'Team delay']}>
            {delays.map(d => {
              const total = d.crDays + d.teamDays + d.clientWait
              return (
                <tr key={d.project}>
                  <td className="font-medium">{d.project}</td><td>{d.milestone}</td><td>{d.baseline}</td>
                  <td className={total ? 'text-amber-600 font-medium' : ''}>{d.current}</td>
                  <td>{total ? <Pill tone={total > 5 ? 'late' : 'risk'}>+{total} days</Pill> : <Pill tone="ok">On time</Pill>}</td>
                  <td>{d.crDays || '–'}</td><td>{d.clientWait || '–'}</td><td className={d.teamDays ? 'text-red-600 font-medium' : ''}>{d.teamDays || '–'}</td>
                </tr>
              )
            })}
          </Table>
          <p className="text-xs text-slate-400 p-3">Every delay is split by cause so CRs and client waiting are never counted as team slowness.</p>
        </Card>
      )}
    </>
  )
}
