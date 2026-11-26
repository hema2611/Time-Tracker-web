// Tiny imperative toast store — call toast.success(msg) / toast.error(msg) from anywhere.
let listeners = []
let seq = 0

function push(message, type) {
  const t = { id: ++seq, message, type }
  listeners.forEach(l => l(t))
}

export const toast = {
  success: msg => push(msg, 'success'),
  error: msg => push(msg, 'error'),
  info: msg => push(msg, 'info'),
}

export function subscribeToasts(fn) {
  listeners.push(fn)
  return () => { listeners = listeners.filter(l => l !== fn) }
}
