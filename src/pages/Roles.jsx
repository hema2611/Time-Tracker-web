import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react'
import { api } from '../lib/api.js'
import { toast } from '../lib/toast.js'
import { Card, Pill, Button, PageHeader, Input, Table, Modal, ConfirmDialog, Dropdown } from '../components/ui.jsx'
import { useAuth } from '../auth.jsx'

const blank = { name: '', status: 'active' }

export default function Roles() {
  const { user } = useAuth()
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [editing, setEditing] = useState(null) // null = closed, {} = new, {id,...} = edit
  const [confirming, setConfirming] = useState(null)
  const [permissionsRole, setPermissionsRole] = useState(null)

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
                    {user.role === 'admin' && (
                      <button onClick={() => setPermissionsRole(r)} className="text-slate-400 hover:text-indigo-600 p-1.5" title="Manage permissions" aria-label={`Manage permissions for ${r.name}`}><ShieldCheck size={16} /></button>
                    )}
                    <button onClick={() => setEditing(r)} className="text-slate-400 hover:text-indigo-600 p-1.5" title="Edit"><Pencil size={16} /></button>
                    <button onClick={() => remove(r)} className="text-slate-400 hover:text-red-600 p-1.5" title="Delete"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
      </Card>

      {editing && <RoleForm role={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
      {permissionsRole && <PermissionsEditor role={permissionsRole} onClose={() => setPermissionsRole(null)} />}
      {confirming && <ConfirmDialog {...confirming} onClose={() => setConfirming(null)} />}
    </div>
  )
}

function PermissionsEditor({ role, onClose }) {
  const [modules, setModules] = useState([])
  const [perms, setPerms] = useState({})
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api(`/permissions/roles/${role.id}`).then(d => { setModules(d.modules); setPerms(d.permissions) }).catch(e => toast.error(e.message)).finally(() => setLoading(false))
  }, [role.id])
  const toggle = (key, action, value) => setPerms(p => ({ ...p, [key]: { ...p[key], view: action === 'view' ? value : (p[key]?.view || value), [action]: value } }))
  const all = (items, checked) => setPerms(p => ({ ...p, ...Object.fromEntries(items.map(m => [m.key, { view: checked, create: checked, edit: checked }])) }))
  const save = async () => {
    setBusy(true)
    try { await api(`/permissions/roles/${role.id}`, { method: 'PUT', body: { permissions: perms } }); toast.success('Permissions saved.'); onClose() }
    catch (e) { toast.error(e.message); setBusy(false) }
  }
  const groups = [...new Set(modules.map(m => m.group))]
  return <Modal title={`Manage permissions · ${role.name}`} onClose={onClose} size="max-w-4xl">
    <div className="max-h-[70vh] overflow-y-auto p-5 space-y-5">
      {loading ? <p className="text-center text-slate-400 py-8">Loading permissions…</p> : groups.map(group => {
        const items = modules.filter(m => m.group === group)
        const enabled = items.every(m => perms[m.key]?.view && perms[m.key]?.create && perms[m.key]?.edit)
        return <section key={group} className="overflow-hidden rounded-xl border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3"><h3 className="font-semibold">{group}</h3><label className="flex items-center gap-2 text-sm text-sky-700"><input type="checkbox" checked={enabled} onChange={e => all(items, e.target.checked)} />Allow All</label></div>
          <table className="w-full text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-sky-700"><tr><th className="px-4 py-2 text-left text-slate-400">Module</th>{['create','edit','view'].map(a => <th key={a} className="px-4 py-2">{a}</th>)}<th className="px-4 py-2">Allow all</th></tr></thead><tbody>{items.map(m => { const p = perms[m.key] || {}; const checked = !!(p.view && p.create && p.edit); return <tr key={m.key} className="even:bg-slate-50"><td className="px-4 py-2 text-sky-700">{m.label}</td>{['create','edit','view'].map(a => <td key={a} className="text-center"><input aria-label={`${m.label} ${a}`} type="checkbox" checked={!!p[a]} onChange={e => toggle(m.key, a, e.target.checked)} /></td>)}<td className="text-center"><input aria-label={`${m.label} allow all`} type="checkbox" checked={checked} onChange={e => setPerms(p => ({ ...p, [m.key]: { view: e.target.checked, create: e.target.checked, edit: e.target.checked } }))} /></td></tr> })}</tbody></table>
        </section>
      })}
      <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={busy || loading} onClick={save}>{busy ? 'Saving…' : 'Save permissions'}</Button></div>
    </div>
  </Modal>
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
