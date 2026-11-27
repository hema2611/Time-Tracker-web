import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../auth.jsx'
import { api } from '../lib/api.js'
import { Brand } from '../components/Layout.jsx'
import { ThemeToggle } from '../lib/theme.jsx'
import { Button, Input, Skeleton } from '../components/ui.jsx'

// Sign-in (DESIGN.md §8, design/tracker-light-prototype.html): purple brand panel on the left, plain form on the right.
const Shell = ({ title, sub, children }) => (
  <div className="relative min-h-screen grid md:grid-cols-[1.1fr_1fr] bg-bg">
    <ThemeToggle className="absolute top-4 right-4 z-10" />
    <div className="brand-panel hidden md:flex flex-col justify-between min-h-screen px-[6vw] pt-12 pb-10">
      <Brand />
      <div>
        <h1 className="text-5xl xl:text-[52px] leading-[1.05] mb-3.5 !text-white">Work, <em className="not-italic font-normal brand-panel-em">recorded.</em></h1>
        <p className="text-[15px] max-w-[340px] text-white/85">Attendance, leaves, EOD, projects and tasks in one place.</p>
      </div>
      <p className="font-display font-normal text-[12px] tracking-[0.26em] uppercase text-white/90">Experience That Evolves. Expertise That Endures.</p>
    </div>
    <div className="grid place-items-center px-6 py-10 md:px-[6vw]">
      <div className="w-full max-w-[400px]">
        <div className="md:hidden mb-8"><Brand /></div>
        <h2 className="text-[26px] font-normal">{title}</h2>
        {sub && <p className="text-fg-2 mt-1 mb-6">{sub}</p>}
        {children}
      </div>
    </div>
  </div>
)

export function Login() {
  const { login } = useAuth()
  const [mode, setMode] = useState('signin') // signin | forgot | sent
  const [f, setF] = useState({ email: '', password: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr('')
    try { await login(f.email, f.password) } catch (x) { setErr(x.status === 401 ? 'Email or password is incorrect.' : x.message) }
    setBusy(false)
  }
  const askReset = async e => {
    e.preventDefault(); setBusy(true); setErr('')
    try { await api('/auth/forgot', { method: 'POST', body: { email: f.email } }); setMode('sent') } catch (x) { setErr(x.message) }
    setBusy(false)
  }
  const back = () => { setMode('signin'); setErr('') }

  if (mode === 'sent') return (
    <Shell title="Check your email" sub={<>If <b className="font-medium text-fg">{f.email}</b> has an account, we’ve sent a link to choose a new password. It works once, for 30 minutes.</>}>
      <p className="text-xs text-fg-3 mb-6" aria-live="polite">Nothing arrived after a few minutes? Check your spam folder, or ask your admin for a temporary password.</p>
      <Button variant="secondary" onClick={back} className="w-full py-3"><ArrowLeft size={16} strokeWidth={1.5} />Back to sign in</Button>
    </Shell>
  )

  if (mode === 'forgot') return (
    <Shell title="Reset your password" sub="Enter your work email and we’ll send you a link to choose a new password.">
      <form onSubmit={askReset} className="space-y-3.5">
        <Input label="Email" type="email" autoComplete="username" required autoFocus placeholder="name@imaginetventures.com" error={err} value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
        <Button variant="primary" type="submit" disabled={busy} className="w-full py-3">{busy ? 'Sending…' : 'Send reset link'}</Button>
        <Button variant="ghost" onClick={back} className="w-full"><ArrowLeft size={16} strokeWidth={1.5} />Back to sign in</Button>
      </form>
    </Shell>
  )

  return (
    <Shell title="Welcome back" sub="Sign in to continue.">
      <form onSubmit={submit} className="space-y-3.5">
        <Input label="Email" type="email" autoComplete="username" required placeholder="name@imaginetventures.com" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
        <Input label="Password" type="password" autoComplete="current-password" required error={err} value={f.password} onChange={e => setF({ ...f, password: e.target.value })} />
        <div className="flex justify-end text-xs -mt-1 mb-1">
          <button type="button" className="text-violet hover:underline" onClick={() => { setMode('forgot'); setErr('') }}>Forgot password?</button>
        </div>
        <Button variant="primary" type="submit" disabled={busy} className="w-full py-3">{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>
    </Shell>
  )
}

// Opened from the email link: /reset-password?token=…  Works signed in or out.
export function ResetPassword() {
  const token = new URLSearchParams(location.search).get('token') || ''
  const [state, setState] = useState('checking') // checking | form | bad | done
  const [f, setF] = useState({ next: '', again: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!token) return setState('bad')
    api(`/auth/reset/${encodeURIComponent(token)}`).then(d => setState(d.valid ? 'form' : 'bad')).catch(() => setState('bad'))
  }, [token])
  const toSignIn = () => { location.href = '/' }
  const submit = async e => {
    e.preventDefault()
    if (f.next !== f.again) return setErr('The two passwords do not match.')
    setBusy(true); setErr('')
    try { await api('/auth/reset', { method: 'POST', body: { token, password: f.next } }); setState('done') } catch (x) { setErr(x.message) }
    setBusy(false)
  }

  if (state === 'checking') return <Shell title="Reset your password"><Skeleton className="h-12 mb-3" /><Skeleton className="h-12 mb-3" /><Skeleton className="h-12" /></Shell>
  if (state === 'bad') return (
    <Shell title="This link has expired" sub="Reset links work once, for 30 minutes. Ask for a new one from the sign-in page.">
      <Button variant="primary" onClick={toSignIn} className="w-full py-3">Back to sign in</Button>
    </Shell>
  )
  if (state === 'done') return (
    <Shell title="Password changed" sub="You can sign in with your new password. Every device that was signed in has been signed out.">
      <Button variant="primary" onClick={toSignIn} className="w-full py-3">Sign in</Button>
    </Shell>
  )
  return (
    <Shell title="Choose a new password" sub="At least 10 characters. Use something you don’t use anywhere else.">
      <form onSubmit={submit} className="space-y-3.5">
        <Input label="New password" type="password" autoComplete="new-password" required autoFocus value={f.next} onChange={e => setF({ ...f, next: e.target.value })} />
        <Input label="New password again" type="password" autoComplete="new-password" required error={err} value={f.again} onChange={e => setF({ ...f, again: e.target.value })} />
        <Button variant="primary" type="submit" disabled={busy} className="w-full py-3">{busy ? 'Saving…' : 'Save new password'}</Button>
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
