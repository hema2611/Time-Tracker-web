// "+ Add new …" inside dropdowns: opens the real master form (same fields and checks as in Masters)
// on top of the current form, and hands the new record's id back so the dropdown selects it.
//
//   const qa = useQuickAdd()
//   <Dropdown … {...qa.props('project', async id => { await reloadProjects(); set('project_id', id) })} />
//   {qa.node}
//
// The option only shows when the signed-in person may create that master (role permissions).
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../lib/api.js'
import { ProjectForm } from '../pages/Projects.jsx'
import { RoleForm } from '../pages/Roles.jsx'
import { EmployeeForm, PasswordNote } from '../pages/Employees.jsx'

const KINDS = {
  project: { perm: 'projects', label: 'Add new project' },
  employee: { perm: 'employees', label: 'Add new employee' },
  role: { perm: 'roles', label: 'Add new role' },
}

// Permissions are read once per page load and shared by every dropdown.
let permsPromise = null
const loadPerms = () => (permsPromise ||= api('/permissions/me').then(p => p.modules || {}).catch(() => { permsPromise = null; return {} }))

export function useQuickAdd() {
  const [perms, setPerms] = useState({})
  const [open, setOpen] = useState(null) // { kind, onCreated }
  const [roles, setRoles] = useState([])
  const [note, setNote] = useState(null)
  useEffect(() => { loadPerms().then(setPerms) }, [])
  useEffect(() => {
    if (open?.kind === 'employee') api('/roles?status=active').then(d => setRoles(d.roles)).catch(() => {})
  }, [open?.kind])

  const can = kind => !!perms[KINDS[kind].perm]?.create
  const props = (kind, onCreated) => (can(kind) ? { onAddNew: () => setOpen({ kind, onCreated }), addLabel: KINDS[kind].label } : {})
  const close = () => setOpen(null)
  const saved = async id => { const cb = open.onCreated; close(); if (id && cb) await cb(id) }

  // The wrapper stops "submit" from travelling up to the form underneath (React passes events through portals).
  const node = createPortal(<div onSubmit={e => e.stopPropagation()}>
    {open?.kind === 'project' && <ProjectForm project={{}} onClose={close} onSaved={saved} />}
    {open?.kind === 'role' && <RoleForm role={{}} onClose={close} onSaved={saved} />}
    {open?.kind === 'employee' && <EmployeeForm emp={{}} roles={roles} onClose={close} onSaved={saved} onNote={setNote} />}
    {note && <PasswordNote {...note} onClose={() => setNote(null)} />}
  </div>, document.body)
  return { can, props, node }
}
