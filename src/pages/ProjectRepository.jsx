import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, ExternalLink, FolderGit2, Copy } from 'lucide-react'
import { api, fmtDate } from '../lib/api.js'
import { toast } from '../lib/toast.js'
import { Card, Button, PageHeader, Input, Textarea, Table, Modal, ConfirmDialog, Dropdown } from '../components/ui.jsx'
import { useQuickAdd } from '../components/QuickAdd.jsx'

const blank = { project_id: '', drive_link: '', description: '' }
const isLink = v => { try { return ['http:', 'https:'].includes(new URL(v).protocol) } catch { return false } }

export default function ProjectRepository() {
  const [perms, setPerms] = useState({ view: true, create: false, edit: false })
  const [projects, setProjects] = useState([])
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [confirming, setConfirming] = useState(null)

  useEffect(() => {
    api('/permissions/me').then(p => setPerms(p.modules?.project_repository || {})).catch(() => {})
    api('/project-repositories/projects').then(d => setProjects(d.projects)).catch(e => toast.error(e.message))
  }, [])

  const load = () => {
    setLoading(true)
    return api(`/project-repositories${filter ? `?project_id=${filter}` : ''}`)
      .then(d => setRows(d.repositories)).catch(e => toast.error(e.message)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [filter])

  const remove = x => setConfirming({
    title: 'Remove this link?',
    message: `The drive link for “${x.project_name}” will be removed from the repository. The drive itself is not touched.`,
    confirmLabel: 'Remove link',
    onConfirm: async () => {
      try { await api(`/project-repositories/${x.id}`, { method: 'DELETE' }); toast.success('Link removed.'); load() }
      catch (e) { toast.error(e.message) }
    },
  })

  const copy = async link => {
    try { await navigator.clipboard.writeText(link); toast.success('Link copied.') } catch { toast.error('Could not copy the link.') }
  }

  const projectOptions = projects.map(p => ({ value: p.id, label: p.status === 'active' ? p.name : `${p.name} (inactive)` }))

  return (
    <div>
      <PageHeader title="Project Repository" sub="Drive links for each project, kept in one place."
        actions={perms.create && <Button variant="primary" onClick={() => setEditing({ ...blank, project_id: filter })}><Plus size={16} className="inline -mt-0.5 mr-1" />Add link</Button>} />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Dropdown className="w-72" value={filter} onChange={setFilter} placeholder="All projects"
          options={[{ value: '', label: 'All projects' }, ...projectOptions]} />
        {!loading && <span className="text-sm text-slate-500">{rows.length} link{rows.length === 1 ? '' : 's'}</span>}
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? <div className="p-8 text-center text-slate-400">Loading…</div>
          : rows.length === 0 ? (
            <div className="p-10 text-center">
              <FolderGit2 size={28} className="mx-auto text-slate-400 mb-2" />
              <p className="text-slate-500">{filter ? 'No links for this project yet.' : 'No links yet.'}</p>
              {perms.create && <p className="text-sm text-slate-400 mt-1">Use <b>Add link</b> to store a project's drive link.</p>}
            </div>
          ) : (
            <Table head={['Project', 'Drive link', 'Description', 'Added', '']}>
              {rows.map(x => (
                <tr key={x.id} className="hover:bg-slate-50 align-top">
                  <td>
                    <div className="font-medium text-slate-800">{x.project_name}</div>
                    {x.client_name && <div className="text-xs text-slate-500">{x.client_name}</div>}
                  </td>
                  <td className="max-w-[320px]">
                    <div className="flex items-center gap-1.5">
                      <a href={x.drive_link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline truncate" title={x.drive_link}>
                        <ExternalLink size={14} className="inline -mt-0.5 mr-1" />{x.drive_link.replace(/^https?:\/\//, '')}
                      </a>
                      <button onClick={() => copy(x.drive_link)} className="text-slate-400 hover:text-indigo-600 p-1 shrink-0" title="Copy link"><Copy size={14} /></button>
                    </div>
                  </td>
                  <td className="max-w-[360px] text-slate-600">
                    {x.description ? <div className="line-clamp-2 whitespace-pre-line" title={x.description}>{x.description}</div> : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="whitespace-nowrap text-slate-600">
                    {fmtDate(x.created_at)}
                    {x.created_by_name && <div className="text-xs text-slate-500">by {x.created_by_name}</div>}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    {perms.edit && (<>
                      <button onClick={() => setEditing({ ...x, description: x.description || '' })} className="text-slate-400 hover:text-indigo-600 p-1.5" title="Edit"><Pencil size={16} /></button>
                      <button onClick={() => remove(x)} className="text-slate-400 hover:text-red-600 p-1.5" title="Remove"><Trash2 size={16} /></button>
                    </>)}
                  </td>
                </tr>
              ))}
            </Table>
          )}
      </Card>

      {editing && <RepoForm item={editing} options={projectOptions} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
      {confirming && <ConfirmDialog {...confirming} onClose={() => setConfirming(null)} />}
    </div>
  )
}

function RepoForm({ item, options: initialOptions, onClose, onSaved }) {
  const [options, setOptions] = useState(initialOptions)
  const qa = useQuickAdd() // "+ Add new project" inside the Project list
  const [f, setF] = useState(item)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k, v) => { setF(s => ({ ...s, [k]: v })); setErrors(e => (e[k] ? { ...e, [k]: undefined } : e)) }

  const submit = async e => {
    e.preventDefault()
    const errs = {}
    if (!f.project_id) errs.project_id = 'Pick a project.'
    if (!f.drive_link.trim()) errs.drive_link = 'Drive link is required.'
    else if (!isLink(f.drive_link.trim())) errs.drive_link = 'Enter a full link starting with https://'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setBusy(true)
    const body = { project_id: Number(f.project_id), drive_link: f.drive_link.trim(), description: f.description.trim() || null }
    try {
      if (item.id) { await api(`/project-repositories/${item.id}`, { method: 'PUT', body }); toast.success('Link updated.') }
      else { await api('/project-repositories', { method: 'POST', body }); toast.success('Link added.') }
      onSaved()
    } catch (x) { setBusy(false); toast.error(x.message) }
  }

  return (
    <Modal title={item.id ? 'Edit link' : 'Add link'} onClose={onClose} size="max-w-lg">
      <form onSubmit={submit} noValidate className="p-5 space-y-4">
        <Dropdown label="Project" required value={f.project_id} error={errors.project_id} onChange={v => set('project_id', v)} placeholder="Select a project" options={options}
          {...qa.props('project', async id => { const d = await api('/project-repositories/projects'); setOptions(d.projects.map(p => ({ value: p.id, label: p.status === 'active' ? p.name : `${p.name} (inactive)` }))); set('project_id', id) })} />
        <Input label="Drive link" req value={f.drive_link} error={errors.drive_link} onChange={e => set('drive_link', e.target.value)} placeholder="https://drive.google.com/…" />        <Textarea label="Description (optional)" rows={3} value={f.description} onChange={e => set('description', e.target.value)} maxLength={2000} placeholder="e.g. Design files and client documents" />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
      {qa.node}
    </Modal>
  )
}
