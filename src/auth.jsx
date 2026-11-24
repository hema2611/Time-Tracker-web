import { createContext, useContext, useEffect, useState } from 'react'
import { api } from './lib/api.js'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  // Only a real "not signed in" answer (401) shows the sign-in screen. A server that is down or restarting is not a sign-out.
  const check = () => {
    setLoading(true); setOffline(false)
    api('/auth/me').then(d => setUser(d.user)).catch(e => { if (e.status === 401) setUser(null); else setOffline(true) }).finally(() => setLoading(false))
  }

  useEffect(() => {
    check()
    const out = () => setUser(null)
    window.addEventListener('tracker:signed-out', out)
    return () => window.removeEventListener('tracker:signed-out', out)
  }, [])

  const login = async (email, password) => setUser((await api('/auth/login', { method: 'POST', body: { email, password } })).user)
  const logout = async () => { await api('/auth/logout', { method: 'POST' }).catch(() => {}); setUser(null) }
  const changePassword = async (current, next) => {
    await api('/auth/change-password', { method: 'POST', body: { current, next } })
    setUser(u => ({ ...u, mustChangePassword: false }))
  }

  return <Ctx.Provider value={{ user, loading, offline, retry: check, login, logout, changePassword }}>{children}</Ctx.Provider>
}
