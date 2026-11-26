import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { api } from '../lib/api.js'
import { toast } from '../lib/toast.js'
import { Card, Pill, Button, PageHeader, Input, Table, Modal, ConfirmDialog, Dropdown } from '../components/ui.jsx'

const blank = { name: '', status: 'active' }

export default function Roles() {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [editing, setEditing] = useState(null) // null = closed, {} = new, {id,...} = edit
  const [confirming, setConfirming] = useState(null)

  const load = () => {
    setLoading(true)
    api('/roles').then(d => setRoles(d.roles)).catch(e => setErr(e.message)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const remove = r => setConfirming({
    title: 'Delete role?',
    message: `“${r.name}” will be permanently removed.`,
    confirmLabel: 'Delete role',
    onConfirm: async () => {
      try { await api(`/roles/${r.id}`, { method: 'DELETE' }); toast.success(`Role “${r.name}” deleted.`); load() }
      catch (e) { toast.error(e.message) }
    },
  })

  return (
    <div>
      <PageHeader title="Role Master" sub="Job roles used in the employee form. Only active roles appear in the dropdown."
        actions={<Button variant="primary" onClick={() => setEditing({ ...blank })}><Plus size={16} className="inline -mt-0.5 mr-1" />Add role</Button>} />

      {err && <p className="text-red-600 text-sm mb-3">{err}</p>}

      <Card className="p-0 overflow-hidden">
        {loading ? <div className="p-8 text-center text-slate-400">Loading…</div>
          : roles.length === 0 ? <div className="p-8 text-center text-slate-400">No roles yet. Add the first one.</div>
          : (
            <Table head={['Role', 'Status', '']}>
              {roles.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="font-medium text-slate-800">{r.name}</td>
                  <td><Pill tone={r.status === 'active' ? 'ok' : 'neutral'}>{r.status === 'active' ? 'Active' : 'Inactive'}</Pill></td>
                  <td className="text-right whitespace-nowrap">
                    <button onClick={() => setEditing(r)} className="text-slate-400 hover:text-indigo-600 p-1.5" title="Edit"><Pencil size={16} /></button>
                    <button onClick={() => remove(r)} className="text-slate-400 hover:text-red-600 p-1.5" title="Delete"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
      </Card>

      {editing && <RoleForm role={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
      {confirming && <ConfirmDialog {...confirming} onClose={() => setConfirming(null)} />}
    </div>
  )
}

function RoleForm({ role, onClose, onSaved }) {
  const [f, setF] = useState({ name: role.name || '', status: role.status || 'active' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k, v) => { setF(s => ({ ...s, [k]: v })); setErrors(e => (e[k] ? { ...e, [k]: undefined } : e)) }

  const submit = async e => {
    e.preventDefault()
    if (!f.name.trim()) { setErrors({ name: 'Role name is required.' }); return }
    setBusy(true)
    try {
      if (role.id) { await api(`/roles/${role.id}`, { method: 'PUT', body: f }); toast.success(`Role “${f.name}” updated.`) }
      else { await api('/roles', { method: 'POST', body: f }); toast.success(`Role “${f.name}” added.`) }
      onSaved()
    } catch (x) { setBusy(false); setErrors({ name: x.message }) }
  }

  return (
    <Modal title={role.id ? 'Edit role' : 'Add role'} onClose={onClose} size="max-w-md">
      <form onSubmit={submit} noValidate className="p-5 space-y-4">
        <Input label="Role name" req value={f.name} error={errors.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Developer" />
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
