import { useState } from 'react'
import { useAuth } from '../auth.jsx'
import { Mark } from '../components/Layout.jsx'
import { Button, Input } from '../components/ui.jsx'

// The plan line: baseline, a change request bends it, go-live moves. Drawn once on load.
const STOPS = [[40, 250, 'Proposal signed'], [190, 250, 'Timeline agreed'], [300, 150, 'CR-4 approved'], [470, 150, 'UAT'], [560, 70, 'Go-live']]
function PlanLine() {
  const d = 'M40 250 L190 250 L300 150 L470 150 L560 70'
  return (
    <svg viewBox="0 0 600 300" className="w-full max-w-xl" role="img" aria-label="A project plan line from proposal to go-live, bending where a change request was approved">
      <defs><linearGradient id="pl" x1="0" x2="1"><stop stopColor="#5ee6ff" /><stop offset="1" stopColor="#8b7cff" /></linearGradient></defs>
      <path d="M40 250 L560 250" stroke="#34407a" strokeWidth="1.5" strokeDasharray="4 7" />
      <text x="560" y="272" textAnchor="end" fill="#6f7bae" fontSize="12">original plan</text>
      <path d={d} fill="none" stroke="url(#pl)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ '--len': 720, strokeDasharray: 720, animation: 'rail-draw 1.5s cubic-bezier(.4,0,.2,1) both' }} />
      {STOPS.map(([x, y, label], i) => (
        <g key={label} style={{ transformOrigin: `${x}px ${y}px`, animation: `node-pop .35s ${0.25 + i * 0.28}s both` }}>
          <circle cx={x} cy={y} r="7" fill="#080c1f" stroke="url(#pl)" strokeWidth="3" />
          <text x={x} y={y - 16} textAnchor={i === 0 ? 'start' : i === STOPS.length - 1 ? 'end' : 'middle'} fill="#cbd2ee" fontSize="13">{label}</text>
        </g>
      ))}
    </svg>
  )
}

const Shell = ({ title, sub, children }) => (
  <div className="min-h-screen grid lg:grid-cols-[1.15fr_1fr]">
    <div className="hidden lg:flex flex-col justify-between p-12 xl:p-16">
      <div className="flex items-center gap-3"><Mark size={32} /><span className="font-display font-semibold text-lg text-slate-900">Tracker</span></div>
      <div>
        <h1 className="text-5xl xl:text-6xl font-semibold leading-[1.05] text-slate-900 max-w-xl">Every change, <span className="rail-text">on the record.</span></h1>
        <p className="text-slate-500 text-base mt-5 max-w-md">One place for the plan, the change requests and what was agreed in each meeting, so nobody has to scroll a chat group to prove it.</p>
        <div className="mt-10"><PlanLine /></div>
      </div>
      <p className="text-xs text-slate-400">Access is by invitation from your admin.</p>
    </div>
    <div className="grid place-items-center p-5">
      <div className="glass border border-slate-200 rounded-3xl w-full max-w-sm p-7 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9)]">
        <div className="flex items-center gap-2.5 lg:hidden mb-6"><Mark /><span className="font-display font-semibold text-slate-900">Tracker</span></div>
        <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
        {sub && <p className="text-slate-500 mt-1.5 mb-5">{sub}</p>}
        {children}
      </div>
    </div>
  </div>
)

export function Login() {
  const { login } = useAuth()
  const [f, setF] = useState({ email: '', password: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr('')
    try { await login(f.email, f.password) } catch (x) { setErr(x.message) }
    setBusy(false)
  }
  return (
    <Shell title="Sign in" sub="Use the email and password given by your admin.">
      <form onSubmit={submit} className="space-y-3.5">
        <Input label="Email" type="email" autoComplete="username" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
        <Input label="Password" type="password" autoComplete="current-password" required value={f.password} onChange={e => setF({ ...f, password: e.target.value })} />
        {err && <p className="text-red-600 text-xs" role="alert">{err}</p>}
        <Button variant="primary" type="submit" disabled={busy} className="w-full py-2.5">{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>
    </Shell>
  )
}

// Shown at first sign-in, because the admin only gives a temporary password.
export function ChangePassword() {
  const { changePassword, logout } = useAuth()
  const [f, setF] = useState({ current: '', next: '', again: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async e => {
    e.preventDefault()
    if (f.next !== f.again) return setErr('The two new passwords do not match.')
    setBusy(true); setErr('')
    try { await changePassword(f.current, f.next) } catch (x) { setErr(x.message) }
    setBusy(false)
  }
  return (
    <Shell title="Choose your own password" sub="Your current password is temporary. Set a new one to continue.">
      <form onSubmit={submit} className="space-y-3.5">
        <Input label="Temporary password" type="password" autoComplete="current-password" required value={f.current} onChange={e => setF({ ...f, current: e.target.value })} />
        <Input label="New password" type="password" autoComplete="new-password" required hint="At least 10 characters" value={f.next} onChange={e => setF({ ...f, next: e.target.value })} />
        <Input label="New password again" type="password" autoComplete="new-password" required value={f.again} onChange={e => setF({ ...f, again: e.target.value })} />
        {err && <p className="text-red-600 text-xs" role="alert">{err}</p>}
        <Button variant="primary" type="submit" disabled={busy} className="w-full py-2.5">{busy ? 'Saving…' : 'Save and continue'}</Button>
        <Button variant="ghost" type="button" onClick={logout} className="w-full">Sign out</Button>
      </form>
    </Shell>
  )
}
