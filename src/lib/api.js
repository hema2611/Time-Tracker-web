// One place for every call to the backend. The session lives in an httpOnly cookie set by the API.
export async function api(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch('/api' + path, {
      method,
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'tracker-ui', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Cannot reach the server. Check your connection and try again.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('tracker:signed-out'))
    throw Object.assign(new Error(data.error || 'Something went wrong. Please try again.'), { status: res.status })
  }
  return data
}

// File upload (multipart). Same error handling as api().
export async function apiUpload(path, file) {
  const body = new FormData()
  body.append('file', file)
  let res
  try {
    res = await fetch('/api' + path, { method: 'POST', credentials: 'same-origin', headers: { 'X-Requested-With': 'tracker-ui' }, body })
  } catch {
    throw new Error('Cannot reach the server. Check your connection and try again.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || 'Upload failed. Please try again.'), { status: res.status })
  return data
}

export const ROLE_LABEL = { admin: 'Admin / HR', tl: 'Team lead', developer: 'Developer', designer: 'Designer', tester: 'Tester', client: 'Client' }
export const roleLabel = u => u.role === 'client' ? `Client – ${u.clientAccess || 'viewer'}` : ROLE_LABEL[u.role] || u.role
export const fmtDate = s => s ? new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '–'
