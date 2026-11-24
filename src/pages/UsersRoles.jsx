import { useEffect, useState } from 'react'
import { Check, Minus, Plus, X } from 'lucide-react'
import { permissions } from '../data/mock.js'
import { api, ROLE_LABEL, roleLabel } from '../lib/api.js'
import { useAuth } from '../auth.jsx'
import { Card, Pill, PageHeader, Button, Table, Input } from '../components/ui.jsx'

const COLS = [['Client', 'Client'], ['TL', 'Team lead'], ['Dev', 'Dev / Designer'], ['Tester', 'Tester'], ['HR', 'Admin / HR']]
const STATUS = { active: ['ok', 'Active'], invited: ['info', 'No password yet'], deactivated: ['neutral', 'Deactivated'] }
const EMPTY = { name: '', email: '', role: 'developer', clientAccess: 'viewer', projectId: '', password: '' }
const selectCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 bg-white'

export default function UsersRoles() {
  const { user: me } = useAuth()
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState(null)
  const [projects, setProjects] = useState([])
  const [filter, setFilter] = useState('All')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [err, setErr] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [pwFor, setPwFor] = useState(null) // { id, value }

  const load = () => api('/users').then(d => setUsers(d.users)).catch(e => setErr(e.message))
  useEffect(() => { load(); api('/projects').then(d => setProjects(d.projects)).catch(() => {}) }, [])

  const shown = (users || []).filter(u => filter === 'All' ? true : filter === 'Team' ? u.role !== 'client' : filter === 'Clients' ? u.role === 'client' : u.status === 'deactivated')
  const run = async (fn, done) => { setBusy(true); setErr(''); setNote(''); try { await fn(); await load(); setNote(done) } catch (e) { setErr(e.message) } setBusy(false) }

  const submit = e => {
    e.preventDefault()
    run(async () => {
      await api('/users', { method: 'POST', body: { name: form.name, email: form.email, role: form.role, password: form.password,
        ...(form.role === 'client' ? { clientAccess: form.clientAccess } : {}), ...(form.projectId ? { projectId: +form.projectId } : {}) } })
      setAdding(false); setForm(EMPTY)
    }, 'User added. Give them the temporary password; they must change it at first sign-in.')
  }
  const setStatus = (u, status) => run(() => api(`/users/${u.id}`, { method: 'PATCH', body: { status } }), status === 'active' ? `${u.name} reactivated.` : `${u.name} deactivated.`)
  const savePassword = u => run(async () => {
    await api(`/users/${u.id}`, { method: 'PATCH', body: { password: pwFor.value, ...(u.status === 'invited' ? { status: 'active' } : {}) } })
    setPwFor(null)
  }, `Temporary password set for ${u.name}. They must change it at first sign-in.`)

  return (
    <>
      <PageHeader title="Users & roles" sub="Create users, assign them to projects, control what each role can do"
        actions={<Button variant="primary" className="flex items-center gap-1.5" onClick={() => { setAdding(true); setErr(''); setNote('') }}><Plus size={15} />Add user</Button>} />

      <div className="flex gap-1 border-b border-slate-200 mb-4">
        {[['users', 'Users'], ['perms', 'Role permissions']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 -mb-px border-b-2 ${tab === k ? 'border-indigo-600 text-indigo-700 font-medium' : 'border-transparent text-slate-500'}`}>{l}</button>
        ))}
      </div>

      {note && <div className="bg-green-50 text-green-700 rounded-lg px-4 py-2.5 mb-4" role="status">{note}</div>}
      {err && <div className="bg-red-50 text-red-700 rounded-lg px-4 py-2.5 mb-4" role="alert">{err}</div>}

      {adding && (
        <Card className="p-4 mb-4">
          <form onSubmit={submit}>
            <div className="flex justify-between mb-3"><b>Add user</b><button type="button" onClick={() => setAdding(false)} aria-label="Close"><X size={16} /></button></div>
            <div className="grid gap-3 md:grid-cols-3">
              <Input label="Name *" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <Input label="Email *" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              <label className="block"><span className="block text-xs font-medium text-slate-600 mb-1">Role *</span>
                <select className={selectCls} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>{Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
              {form.role === 'client' && (
                <label className="block"><span className="block text-xs font-medium text-slate-600 mb-1">Client access</span>
                  <select className={selectCls} value={form.clientAccess} onChange={e => setForm({ ...form, clientAccess: e.target.value })}><option value="approver">Approver</option><option value="viewer">Viewer</option></select></label>
              )}
              <label className="block"><span className="block text-xs font-medium text-slate-600 mb-1">Add to project</span>
                <select className={selectCls} value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}><option value="">None for now</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
              <Input label="Temporary password *" required minLength={10} autoComplete="off" hint="At least 10 characters. They must change it at first sign-in." value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="mt-3"><Button variant="primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Add user'}</Button></div>
          </form>
        </Card>
      )}

      {tab === 'users' ? (
        <Card>
          <div className="flex gap-1 p-3 border-b border-slate-100">
            {['All', 'Team', 'Clients', 'Deactivated'].map(f => <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-md ${filter === f ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{f}</button>)}
          </div>
          {!users ? <p className="p-6 text-slate-400">Loading users…</p> : (
            <Table head={['Name', 'Email', 'Role', 'Projects', 'Status', '']}>
              {shown.map(u => (
                <tr key={u.id} className={u.status === 'deactivated' ? 'opacity-50' : ''}>
                  <td className="font-medium">{u.name}{u.id === me.id && <span className="text-xs text-slate-400 font-normal"> (you)</span>}</td>
                  <td className="text-slate-500">{u.email}</td>
                  <td>{u.role === 'client' ? <Pill tone="risk">{roleLabel(u)}</Pill> : roleLabel(u)}</td>
                  <td className="text-xs text-slate-500">{u.projects.join(', ') || '–'}</td>
                  <td><Pill tone={STATUS[u.status][0]}>{STATUS[u.status][1]}</Pill></td>
                  <td className="text-right whitespace-nowrap">
                    {pwFor?.id === u.id ? (
                      <span className="inline-flex gap-1.5 items-center">
                        <input autoFocus aria-label={`Temporary password for ${u.name}`} placeholder="Temporary password (10+)" autoComplete="off" value={pwFor.value} onChange={e => setPwFor({ id: u.id, value: e.target.value })} className="border border-slate-200 rounded px-2 py-1 w-52" />
                        <Button variant="primary" disabled={busy || pwFor.value.length < 10} onClick={() => savePassword(u)}>Save</Button>
                        <Button variant="ghost" onClick={() => setPwFor(null)}>Cancel</Button>
                      </span>
                    ) : (
                      <>
                        {u.status !== 'deactivated' && <Button variant="ghost" onClick={() => setPwFor({ id: u.id, value: '' })}>{u.status === 'invited' ? 'Set password' : 'Reset password'}</Button>}
                        {u.status === 'deactivated' ? <Button variant="ghost" disabled={busy} onClick={() => setStatus(u, 'active')}>Reactivate</Button>
                          : u.id !== me.id && u.status === 'active' && <Button variant="ghost" disabled={busy} onClick={() => setStatus(u, 'deactivated')}>Deactivate</Button>}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          )}
          <p className="text-xs text-slate-400 p-3">Users are deactivated, never deleted, so their history stays.</p>
        </Card>
      ) : (
        <Card>
          <Table head={['Permission', ...COLS.map(c => c[1])]}>
            {permissions.map(p => (
              <tr key={p.name}>
                <td className="font-medium">{p.name}</td>
                {COLS.map(([k]) => {
                  const v = p.roles[k]
                  return <td key={k} className="text-center">{v === true ? <Check size={16} className="inline text-green-600" /> : v === false ? <Minus size={16} className="inline text-slate-300" /> : <Pill tone="info">{v}</Pill>}</td>
                })}
              </tr>
            ))}
          </Table>
          <p className="text-xs text-slate-400 p-3">This table is the planned access for each role. Clients never see entries marked Internal.</p>
        </Card>
      )}
    </>
  )
}
