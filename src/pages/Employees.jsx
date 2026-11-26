import { useEffect, useRef, useState } from 'react'
import { Plus, Pencil, Trash2, Upload } from 'lucide-react'
import { api, apiUpload, fmtDate } from '../lib/api.js'
import { toast } from '../lib/toast.js'
import { Card, Pill, Button, PageHeader, Input, Table, Modal, ConfirmDialog, Dropdown, DatePicker, Avatar } from '../components/ui.jsx'

const BLOOD = [
  'A1+ve', 'A1-ve', 'A2+ve', 'A2-ve',
  'B+ve', 'B-ve',
  'A1B+ve', 'A1B-ve', 'A2B+ve', 'A2B-ve',
  'AB+ve', 'AB-ve',
  'O+ve', 'O-ve',
  'Bombay',
]
const STATUS = [
  { v: 'active', label: 'Active', tone: 'ok' },
  { v: 'inactive', label: 'Inactive', tone: 'neutral' },
  { v: 'notice_period', label: 'Notice Period', tone: 'risk' },
  { v: 'resigned', label: 'Resigned', tone: 'done' },
  { v: 'terminated', label: 'Terminated', tone: 'late' },
]
const statusMeta = v => STATUS.find(s => s.v === v) || STATUS[0]
const blank = {
  emp_no: '', name: '', date_of_birth: '', blood_group: '', phone: '', emergency_contact: '',
  aadhar_no: '', photo: '', role_id: '', join_date: '', last_date: '', status: 'active',
  bank_name: '', account_no: '', ifsc: '', branch_name: '',
}

export default function Employees() {
  const [rows, setRows] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [editing, setEditing] = useState(null)
  const [confirming, setConfirming] = useState(null)

  const load = () => {
    setLoading(true)
    Promise.all([api('/employees'), api('/roles?status=active')])
      .then(([e, r]) => { setRows(e.employees); setRoles(r.roles) })
      .catch(e => setErr(e.message)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const remove = emp => setConfirming({
    title: 'Delete employee?',
    message: `${emp.name} (${emp.emp_no}) will be permanently removed.`,
    confirmLabel: 'Delete employee',
    onConfirm: async () => {
      try { await api(`/employees/${emp.id}`, { method: 'DELETE' }); toast.success(`${emp.name} deleted.`); load() }
      catch (e) { toast.error(e.message) }
    },
  })

  return (
    <div>
      <PageHeader title="Employee Master" sub="Basic and professional details for every employee."
        actions={<Button variant="primary" onClick={() => setEditing({ ...blank })}><Plus size={16} className="inline -mt-0.5 mr-1" />Add employee</Button>} />

      {err && <p className="text-red-600 text-sm mb-3">{err}</p>}

      <Card className="p-0 overflow-hidden">
        {loading ? <div className="p-8 text-center text-slate-400">Loading…</div>
          : rows.length === 0 ? <div className="p-10 text-center text-slate-400">No employees yet. Add the first one.</div>
          : (
            <Table head={['Employee', 'Emp No', 'Role', 'Phone', 'Join date', 'Status', '']}>
              {rows.map(e => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar photo={e.photo} name={e.name} />
                      <div>
                        <div className="font-medium text-slate-800">{e.name}</div>
                        <div className="text-xs text-slate-400">{e.blood_group || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-slate-600">{e.emp_no}</td>
                  <td className="text-slate-600">{e.role_name || '—'}</td>
                  <td className="text-slate-600">{e.phone || '—'}</td>
                  <td className="text-slate-600">{fmtDate(e.join_date)}</td>
                  <td><Pill tone={statusMeta(e.status).tone}>{statusMeta(e.status).label}</Pill></td>
                  <td className="text-right whitespace-nowrap">
                    <button onClick={() => setEditing(e)} className="text-slate-400 hover:text-indigo-600 p-1.5" title="Edit"><Pencil size={16} /></button>
                    <button onClick={() => remove(e)} className="text-slate-400 hover:text-red-600 p-1.5" title="Delete"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
      </Card>

      {editing && <EmployeeForm emp={editing} roles={roles} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
      {confirming && <ConfirmDialog {...confirming} onClose={() => setConfirming(null)} />}
    </div>
  )
}

const Section = ({ title, step, children }) => (
  <div>
    <div className="flex items-center gap-2 mb-4">
      <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 grid place-items-center text-xs font-semibold">{step}</span>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <span className="flex-1 h-px bg-slate-100 ml-1" />
    </div>
    <div className="grid sm:grid-cols-2 gap-x-4 gap-y-3.5">{children}</div>
  </div>
)
const digits = (s, n) => (s || '').replace(/\D/g, '').slice(0, n)

function validateEmployee(f) {
  const e = {}
  if (!f.emp_no.trim()) e.emp_no = 'Employee number is required.'
  if (!f.name.trim()) e.name = 'Full name is required.'
  if (!f.photo) e.photo = 'Please upload a photo.'
  if (!f.date_of_birth) e.date_of_birth = 'Date of birth is required.'
  if (!f.blood_group) e.blood_group = 'Select a blood group.'
  if (!/^\d{10}$/.test(f.phone)) e.phone = 'Enter a 10-digit mobile number.'
  if (!/^\d{10}$/.test(f.emergency_contact)) e.emergency_contact = 'Enter a 10-digit mobile number.'
  if (!/^\d{12}$/.test(f.aadhar_no)) e.aadhar_no = 'Enter a 12-digit Aadhaar number.'
  if (!f.role_id) e.role_id = 'Select a role.'
  if (!f.join_date) e.join_date = 'Join date is required.'
  return e
}

function EmployeeForm({ emp, roles, onClose, onSaved }) {
  const [f, setF] = useState(() => {
    const init = { ...blank, ...emp, role_id: emp.role_id ?? '' }
    for (const k of Object.keys(blank)) if (init[k] == null) init[k] = ''
    return init
  })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const set = (k, v) => { setF(s => ({ ...s, [k]: v })); setErrors(e => (e[k] ? { ...e, [k]: undefined } : e)) }

  const pickPhoto = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try { const { photo } = await apiUpload('/employees/photo', file); set('photo', photo) }
    catch (x) { toast.error(x.message) }
    setUploading(false)
  }

  const submit = async e => {
    e.preventDefault()
    const errs = validateEmployee(f)
    if (Object.keys(errs).length) { setErrors(errs); toast.error('Please fix the highlighted fields.'); return }
    setBusy(true)
    try {
      if (emp.id) { await api(`/employees/${emp.id}`, { method: 'PUT', body: f }); toast.success(`${f.name} updated.`) }
      else { await api('/employees', { method: 'POST', body: f }); toast.success(`${f.name} added.`) }
      onSaved()
    } catch (x) {
      setBusy(false)
      // Surface a duplicate emp_no error on the field; otherwise toast it.
      if (/employee number/i.test(x.message)) setErrors(e => ({ ...e, emp_no: x.message }))
      else toast.error(x.message)
    }
  }

  return (
    <Modal title={emp.id ? 'Edit employee' : 'Add employee'} sub="Fill in the details. Banking information is optional." onClose={onClose} size="max-w-3xl">
      <form onSubmit={submit} noValidate className="flex flex-col max-h-[80vh]">
        <div className="p-6 space-y-7 overflow-y-auto">
          {/* Identity + photo band */}
          <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start bg-slate-50 border border-slate-100 rounded-xl p-4">
            <div className="text-center shrink-0">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPhoto} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                title="Click to upload a photo"
                className={`relative rounded-full group ${errors.photo ? 'ring-2 ring-red-300 ring-offset-2 rounded-full' : ''}`}>
                <Avatar photo={f.photo} name={f.name} size={84} />
                <span className="absolute inset-0 rounded-full bg-slate-900/45 opacity-0 group-hover:opacity-100 transition grid place-items-center text-white">
                  <Upload size={18} />
                </span>
              </button>
              <div className="mt-2 text-xs font-medium text-indigo-600">{uploading ? 'Uploading…' : f.photo ? 'Change photo' : 'Upload photo *'}</div>
              {errors.photo && <div className="text-xs text-red-600 mt-0.5">{errors.photo}</div>}
            </div>
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-3.5 flex-1 w-full">
              <Input label="Employee no" req value={f.emp_no} error={errors.emp_no} onChange={e => set('emp_no', e.target.value)} placeholder="EMP001" />
              <Input label="Full name" req value={f.name} error={errors.name} onChange={e => set('name', e.target.value)} placeholder="Full name" />
            </div>
          </div>

          <Section step="1" title="Basic Information">
            <DatePicker label="Date of birth" req value={f.date_of_birth} error={errors.date_of_birth} onChange={v => set('date_of_birth', v)} maxYear={new Date().getFullYear()} />
            <Dropdown label="Blood group" req value={f.blood_group} error={errors.blood_group} onChange={v => set('blood_group', v)} placeholder="Select blood group"
              options={[{ value: '', label: '—' }, ...BLOOD.map(b => ({ value: b, label: b }))]} />
            <Input label="Phone no" req inputMode="numeric" value={f.phone} error={errors.phone} onChange={e => set('phone', digits(e.target.value, 10))} placeholder="10-digit mobile" />
            <Input label="Emergency contact" req inputMode="numeric" value={f.emergency_contact} error={errors.emergency_contact} onChange={e => set('emergency_contact', digits(e.target.value, 10))} placeholder="10-digit mobile" />
            <Input label="Aadhar no" req inputMode="numeric" value={f.aadhar_no} error={errors.aadhar_no} onChange={e => set('aadhar_no', digits(e.target.value, 12))} placeholder="12-digit Aadhaar" className="sm:col-span-2" />
          </Section>

          <Section step="2" title="Professional Information">
            <Dropdown label="Role" req value={f.role_id} error={errors.role_id} onChange={v => set('role_id', v)} placeholder="Select role"
              options={[{ value: '', label: '—' }, ...roles.map(r => ({ value: r.id, label: r.name }))]} />
            <Dropdown label="Status" req value={f.status} onChange={v => set('status', v)}
              options={STATUS.map(s => ({ value: s.v, label: s.label }))} />
            <DatePicker label="Join date" req value={f.join_date} error={errors.join_date} onChange={v => set('join_date', v)} />
            <DatePicker label="Last date" value={f.last_date} onChange={v => set('last_date', v)} hint="Optional — for resigned / terminated employees" />
          </Section>

          <Section step="3" title="Banking Information (optional)">
            <Input label="Bank name" value={f.bank_name} onChange={e => set('bank_name', e.target.value)} placeholder="e.g. HDFC Bank" />
            <Input label="Account no" value={f.account_no} onChange={e => set('account_no', e.target.value)} placeholder="Account number" />
            <Input label="IFSC code" value={f.ifsc} onChange={e => set('ifsc', e.target.value.toUpperCase())} placeholder="e.g. HDFC0001234" />
            <Input label="Branch name" value={f.branch_name} onChange={e => set('branch_name', e.target.value)} placeholder="Branch" />
          </Section>
        </div>

        {/* Sticky footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-white rounded-b-2xl">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy || uploading}>{busy ? 'Saving…' : 'Save employee'}</Button>
        </div>
      </form>
    </Modal>
  )
}
