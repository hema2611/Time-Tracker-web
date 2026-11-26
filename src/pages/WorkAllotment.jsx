import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Briefcase, Globe, Smartphone, ListChecks } from 'lucide-react'
import { api, fmtDate } from '../lib/api.js'
import { toast } from '../lib/toast.js'
import { Card, Button, PageHeader, Input, Modal, ConfirmDialog, Dropdown, MultiSelect, Avatar, DatePicker } from '../components/ui.jsx'

const TEAM_ICON = { website: Globe, application: Smartphone }
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const blankItem = () => ({ key: Math.random().toString(36).slice(2), project_id: '', employee_ids: [], works: [''] })

export default function WorkAllotment() {
  const [perms, setPerms] = useState({ view: true, create: false, edit: false })
  const [teams, setTeams] = useState({ website: 'Website Team', application: 'Application Development' })
  const [scope, setScope] = useState('all')
  const [team, setTeam] = useState('')
  const [date, setDate] = useState(todayISO())
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [confirming, setConfirming] = useState(null)

  useEffect(() => { api('/permissions/me').then(p => setPerms(p.modules?.work_allotment || {})).catch(() => {}) }, [])
  const manager = perms.create || perms.edit

  const load = () => {
    setLoading(true)
    const q = new URLSearchParams({ ...(date && { date }), ...(team && { team }), ...(manager && scope === 'mine' && { scope: 'mine' }) })
    return api(`/work-allotments?${q}`).then(d => { setRows(d.allotments); setTeams(d.teams) }).catch(e => toast.error(e.message)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [date, team, scope, manager])

  const remove = a => setConfirming({
    title: 'Remove this allotment?',
    message: `The ${teams[a.team]} allotment with ${a.items.length} project${a.items.length === 1 ? '' : 's'} will be removed for everyone on it.`,
    confirmLabel: 'Remove',
    onConfirm: async () => {
      try { await api(`/work-allotments/${a.id}`, { method: 'DELETE' }); toast.success('Allotment removed.'); load() }
      catch (e) { toast.error(e.message) }
    },
  })

  return (
    <div>
      <PageHeader title="Work Allotment" sub={manager ? 'Assign works on projects to employees, team by team.' : 'Work assigned to you.'}
        actions={perms.create && <Button variant="primary" onClick={() => setEditing({ team: '', items: [blankItem()] })}><Plus size={16} className="inline -mt-0.5 mr-1" />Allot work</Button>} />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        {manager && (
          <div className="inline-flex bg-surface border border-slate-200 rounded-xl p-1 shadow-sm">
            {[{ v: 'all', label: perms.edit ? 'All allotments' : 'Assigned by me & mine' }, { v: 'mine', label: 'My work' }].map(t => (
              <button key={t.v} onClick={() => setScope(t.v)} aria-pressed={scope === t.v}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${scope === t.v ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>{t.label}</button>
            ))}
          </div>
        )}
        <DatePicker className="w-52" value={date} onChange={v => setDate(v || todayISO())} />
        {date !== todayISO() && <button onClick={() => setDate(todayISO())} className="text-sm font-medium text-indigo-600 hover:underline">Back to today</button>}
        <Dropdown className="w-60" value={team} onChange={setTeam} placeholder="All teams"
          options={[{ value: '', label: 'All teams' }, ...Object.entries(teams).map(([v, label]) => ({ value: v, label }))]} />
      </div>

      {loading ? <Card className="p-8 text-center text-slate-400">Loading…</Card>
        : rows.length === 0 ? (
          <Card className="p-10 text-center">
            <Briefcase size={28} className="mx-auto text-slate-400 mb-2" />
            <p className="text-slate-500">{date === todayISO() ? (manager && scope === 'all' ? 'No work allotted today.' : 'No work allotted to you today.') : `No allotments on ${fmtDate(date)}.`}</p>
            {perms.create && date === todayISO() && <p className="text-sm text-slate-400 mt-1">Use <b>Allot work</b> above.</p>}
          </Card>
        ) : (
          <div className="space-y-4">
            {rows.map(a => {
              const Icon = TEAM_ICON[a.team] || Briefcase
              return (
                <Card key={a.id} className="p-0 overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
                    <span className="w-9 h-9 rounded-xl grid place-items-center bg-indigo-50 text-indigo-600 shrink-0"><Icon size={17} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-800">{teams[a.team]}</div>
                      <div className="text-xs text-slate-500">{fmtDate(a.created_at)}{a.created_by_name ? ` · by ${a.created_by_name}` : ''} · {a.items.length} project{a.items.length === 1 ? '' : 's'}</div>
                    </div>
                    {!a.is_today && <span className="text-xs text-slate-400" title="Past allotments cannot be changed">Locked</span>}
                    {a.can_edit && (<>
                      <button onClick={() => setEditing({ id: a.id, team: a.team, items: a.items.map(i => ({ key: String(i.id), project_id: i.project_id, employee_ids: i.employees.map(e => e.id), works: i.works.length ? i.works : [''] })) })}
                        className="text-slate-400 hover:text-indigo-600 p-1.5" title="Edit"><Pencil size={16} /></button>
                      <button onClick={() => remove(a)} className="text-slate-400 hover:text-red-600 p-1.5" title="Remove"><Trash2 size={16} /></button>
                    </>)}
                  </div>
                  <div className="divide-y divide-slate-200">
                    {a.items.map(i => (
                      <div key={i.id} className="px-4 py-3 grid md:grid-cols-[220px_1fr_1fr] gap-3">
                        <div>
                          <div className="font-medium text-slate-800">{i.project_name}</div>
                          {i.client_name && <div className="text-xs text-slate-500">{i.client_name}</div>}
                        </div>
                        <div className="flex flex-wrap gap-1.5 content-start">
                          {i.employees.map(e => (
                            <span key={e.id} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 pl-0.5 pr-2.5 py-0.5 text-sm text-slate-700">
                              <Avatar photo={e.photo} name={e.name} size={22} />{e.name}
                            </span>
                          ))}
                        </div>
                        <ul className="space-y-1">
                          {i.works.map((w, k) => (
                            <li key={k} className="flex gap-2 text-sm text-slate-700"><ListChecks size={15} className="text-indigo-600 shrink-0 mt-0.5" /><span className="whitespace-pre-line">{w}</span></li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </Card>
              )
            })}
          </div>
        )}

      {editing && <AllotForm item={editing} teams={teams} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
      {confirming && <ConfirmDialog {...confirming} onClose={() => setConfirming(null)} />}
    </div>
  )
}

/* ---------- Allot / edit ---------- */

function AllotForm({ item, teams, onClose, onSaved }) {
  const [team, setTeam] = useState(item.team)
  const [items, setItems] = useState(item.items)
  const [opts, setOpts] = useState({ projects: [], employees: [] })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => { api('/work-allotments/options').then(setOpts).catch(e => toast.error(e.message)) }, [])

  const clear = k => setErrors(e => (e[k] ? { ...e, [k]: undefined } : e))
  const setItem = (idx, k, v) => { setItems(list => list.map((it, i) => (i === idx ? { ...it, [k]: v } : it))); clear(`${idx}.${k}`) }
  const setWork = (idx, w, v) => setItem(idx, 'works', items[idx].works.map((x, j) => (j === w ? v : x)))
  const addWork = idx => setItem(idx, 'works', [...items[idx].works, ''])
  const removeWork = (idx, w) => setItem(idx, 'works', items[idx].works.length > 1 ? items[idx].works.filter((_, j) => j !== w) : [''])

  const projectOptions = idx => {
    const taken = new Set(items.filter((_, i) => i !== idx).map(i => String(i.project_id)).filter(Boolean))
    return opts.projects.filter(p => !taken.has(String(p.id))).map(p => ({ value: p.id, label: p.client_name ? `${p.name} · ${p.client_name}` : p.name }))
  }
  const employeeOptions = opts.employees.map(e => ({ value: e.id, label: e.emp_no ? `${e.name} (${e.emp_no})` : e.name }))

  const submit = async e => {
    e.preventDefault()
    const errs = {}
    if (!team) errs.team = 'Pick a team.'
    items.forEach((it, i) => {
      if (!it.project_id) errs[`${i}.project_id`] = 'Pick a project.'
      if (!it.employee_ids.length) errs[`${i}.employee_ids`] = 'Pick at least one employee.'
      if (!it.works.some(w => w.trim())) errs[`${i}.works`] = 'Enter at least one work.'
    })
    if (Object.keys(errs).length) { setErrors(errs); toast.error('Fill in the highlighted fields.'); return }
    setBusy(true)
    const body = { team, items: items.map(it => ({ project_id: Number(it.project_id), employee_ids: it.employee_ids.map(Number), works: it.works.map(w => w.trim()).filter(Boolean) })) }
    try {
      if (item.id) { await api(`/work-allotments/${item.id}`, { method: 'PUT', body }); toast.success('Allotment updated.') }
      else { await api('/work-allotments', { method: 'POST', body }); toast.success('Work allotted.') }
      onSaved()
    } catch (x) { setBusy(false); toast.error(x.message) }
  }

  const allTaken = opts.projects.length > 0 && items.length >= opts.projects.length

  return (
    <Modal title={item.id ? 'Edit allotment' : 'Allot work'} sub="Pick the team, then a project, its employees and the works. Add more projects below." onClose={onClose} size="max-w-3xl">
      <form onSubmit={submit} noValidate className="p-5 space-y-4">
        <Dropdown label="Team" required value={team} error={errors.team} onChange={v => { setTeam(v); clear('team') }} placeholder="Select a team"
          options={Object.entries(teams).map(([v, label]) => ({ value: v, label }))} />

        {items.map((it, idx) => (
          <div key={it.key} className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Project {idx + 1}</span>
              {items.length > 1 && (
                <button type="button" onClick={() => setItems(list => list.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-600 p-1 text-sm inline-flex items-center gap-1">
                  <Trash2 size={14} />Remove project
                </button>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Dropdown label="Project" required value={it.project_id} error={errors[`${idx}.project_id`]} onChange={v => setItem(idx, 'project_id', v)}
                placeholder={opts.projects.length ? 'Select a project' : 'No active projects'} options={projectOptions(idx)} />
              <MultiSelect label="Employees" req value={it.employee_ids} error={errors[`${idx}.employee_ids`]} onChange={v => setItem(idx, 'employee_ids', v)}
                placeholder="Select employees" options={employeeOptions} />
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-600 mb-1">Works<span className="text-red-500"> *</span></span>
              <div className="space-y-2">
                {it.works.map((w, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-5 text-right tabular-nums">{j + 1}.</span>
                    <Input className="flex-1" value={w} onChange={e => setWork(idx, j, e.target.value)} maxLength={500}
                      placeholder={j === 0 ? 'e.g. Build the login screen' : 'Another work'} aria-label={`Work ${j + 1}`}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addWork(idx) } }} />
                    <button type="button" onClick={() => removeWork(idx, j)} className="text-slate-400 hover:text-red-600 p-1" aria-label={`Remove work ${j + 1}`}><X size={15} /></button>
                  </div>
                ))}
              </div>
              {errors[`${idx}.works`] && <span className="block text-xs text-red-600 mt-1">{errors[`${idx}.works`]}</span>}
              <button type="button" onClick={() => addWork(idx)} className="mt-2 text-sm font-medium text-indigo-600 hover:underline inline-flex items-center gap-1"><Plus size={14} />Add work</button>
            </div>
          </div>
        ))}

        <button type="button" onClick={() => setItems(list => [...list, blankItem()])} disabled={allTaken}
          className="w-full rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-medium text-indigo-600 hover:border-indigo-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5">
          <Plus size={16} />{allTaken ? 'Every project is already added' : 'Add another project'}
        </button>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Saving…' : item.id ? 'Save changes' : 'Allot work'}</Button>
        </div>
      </form>
    </Modal>
  )
}
