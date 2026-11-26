import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { subscribeToasts } from '../lib/toast.js'

const META = {
  success: { icon: CheckCircle2, ring: 'border-green-200', dot: 'text-green-600', bar: 'bg-green-500' },
  error: { icon: XCircle, ring: 'border-red-200', dot: 'text-red-600', bar: 'bg-red-500' },
  info: { icon: Info, ring: 'border-indigo-200', dot: 'text-indigo-600', bar: 'bg-indigo-500' },
}

export default function Toaster() {
  const [toasts, setToasts] = useState([])

  useEffect(() => subscribeToasts(t => {
    setToasts(list => [...list, t])
    setTimeout(() => setToasts(list => list.filter(x => x.id !== t.id)), 3200)
  }), [])

  const dismiss = id => setToasts(list => list.filter(x => x.id !== id))

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2.5 w-[min(92vw,360px)]">
      {toasts.map(t => {
        const m = META[t.type] || META.info
        const Icon = m.icon
        return (
          <div key={t.id} role="status"
            className={`relative overflow-hidden flex items-start gap-3 bg-surface border ${m.ring} rounded-xl shadow-pop px-4 py-3 rise`}>
            <Icon size={20} className={`${m.dot} shrink-0 mt-0.5`} />
            <p className="flex-1 text-sm text-slate-700 leading-snug">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-fg-3 hover:text-fg cursor-pointer shrink-0" aria-label="Dismiss"><X size={15} /></button>
            <span className={`absolute left-0 bottom-0 h-0.5 ${m.bar} animate-[toast-bar_3.2s_linear_forwards]`} />
          </div>
        )
      })}
    </div>
  )
}
