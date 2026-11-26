import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { api } from '../lib/api.js'
import { toast } from '../lib/toast.js'
import { Card, Pill, Button, PageHeader, Input, Table, Modal, ConfirmDialog, Dropdown } from '../components/ui.jsx'

const blank = { name: '', client_name: '', address: '', contact_person: '', status: 'active' }

export default function Projects() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [editing, setEditing] = useState(null)
  const [confirming, setConfirming] = useState(null)

  const load = () => {
    setLoading(true)
    api('/project-master').then(d => setRows(d.projects)).catch(e => setErr(e.message)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const remove = p => setConfirming({
    title: 'Delete project?',
    message: `“${p.name}” will be permanently removed.`,
    confirmLabel: 'Delete project',
    onConfirm: async () => {
      try { await api(`/project-master/${p.id}`, { method: 'DELETE' }); toast.success(`Project “${p.name}” deleted.`); load() }
      catch (e) { toast.error(e.message) }
    },
  })

  return (
    <div>
      <PageHeader title="Project Master" sub="Projects, their client and contact person."
        actions={<Button variant="primary" onClick={() => setEditing({ ...blank })}><Plus size={16} className="inline -mt-0.5 mr-1" />Add project</Button>} />

      {err && <p className="text-red-600 text-sm mb-3">{err}</p>}

      <Card className="p-0 overflow-hidden">
        {loading ? <div className="p-8 text-center text-slate-400">Loading…</div>
          : rows.length === 0 ? <div className="p-10 text-center text-slate-400">No projects yet. Add the first one.</div>
          : (
            <Table head={['Project', 'Client', 'Contact person', 'Address', 'Status', '']}>
              {rows.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="font-medium text-slate-800">{p.name}</td>
                  <td className="text-slate-600">{p.client_name || '—'}</td>
                  <td className="text-slate-600">{p.contact_person || '—'}</td>
                  <td className="text-slate-600">{p.address || '—'}</td>
                  <td><Pill tone={p.status === 'active' ? 'ok' : 'neutral'}>{p.status === 'active' ? 'Active' : 'Inactive'}</Pill></td>
                  <td className="text-right whitespace-nowrap">
                    <button onClick={() => setEditing(p)} className="text-slate-400 hover:text-indigo-600 p-1.5" title="Edit"><Pencil size={16} /></button>
                    <button onClick={() => remove(p)} className="text-slate-400 hover:text-red-600 p-1.5" title="Delete"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
      </Card>

      {editing && <ProjectForm project={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
      {confirming && <ConfirmDialog {...confirming} onClose={() => setConfirming(null)} />}
    </div>
  )
}

function ProjectForm({ project, onClose, onSaved }) {
  const [f, setF] = useState({ ...blank, ...project, client_name: project.client_name || '', address: project.address || '', contact_person: project.contact_person || '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k, v) => { setF(s => ({ ...s, [k]: v })); setErrors(e => (e[k] ? { ...e, [k]: undefined } : e)) }

  const submit = async e => {
    e.preventDefault()
    const errs = {}
    if (!f.name.trim()) errs.name = 'Project name is required.'
    if (!f.client_name.trim()) errs.client_name = 'Client name is required.'
    if (!f.contact_person.trim()) errs.contact_person = 'Contact person is required.'
    if (!f.address.trim()) errs.address = 'Address is required.'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setBusy(true)
    try {
      if (project.id) { await api(`/project-master/${project.id}`, { method: 'PUT', body: f }); toast.success(`Project “${f.name}” updated.`) }
      else { await api('/project-master', { method: 'POST', body: f }); toast.success(`Project “${f.name}” added.`) }
      onSaved()
    } catch (x) { setBusy(false); toast.error(x.message) }
  }

  return (
    <Modal title={project.id ? 'Edit project' : 'Add project'} onClose={onClose} size="max-w-lg">
      <form onSubmit={submit} noValidate className="p-5 space-y-4">
        <Input label="Project name" req value={f.name} error={errors.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Travel Management App" />
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Client name" req value={f.client_name} error={errors.client_name} onChange={e => set('client_name', e.target.value)} placeholder="Client company" />
          <Input label="Contact person" req value={f.contact_person} error={errors.contact_person} onChange={e => set('contact_person', e.target.value)} placeholder="Name" />
        </div>
        <Input label="Address" req value={f.address} error={errors.address} onChange={e => set('address', e.target.value)} placeholder="Client / project address" />
        <Dropdown label="Status" value={f.status} onChange={v => set('status', v)}
          options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  )
}
