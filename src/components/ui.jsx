export const Card = ({ className = '', children }) => (
  <div className={`glass border border-slate-200 rounded-2xl shadow-[0_18px_50px_-28px_rgb(0_0_0/0.9)] ${className}`}>{children}</div>
)

const PILL = {
  ok: 'bg-green-100 text-green-700', risk: 'bg-amber-100 text-amber-700', late: 'bg-red-100 text-red-700',
  done: 'bg-slate-100 text-slate-600', info: 'bg-indigo-50 text-indigo-700', neutral: 'bg-slate-100 text-slate-600',
}
export const Pill = ({ tone = 'neutral', children }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${PILL[tone]}`}>{children}</span>
)

export const Button = ({ variant = 'default', className = '', ...p }) => {
  const v = {
    default: 'bg-slate-100 border-slate-200 hover:border-slate-300 hover:bg-slate-200 text-slate-700',
    primary: 'rail border-transparent text-ink hover:brightness-110 shadow-[0_0_26px_-8px_#5ee6ff]',
    success: 'bg-green-600 border-green-600 hover:bg-green-700 text-white',
    ghost: 'border-transparent hover:bg-slate-100 text-slate-600',
  }[variant]
  return <button className={`border rounded-xl px-3.5 py-1.5 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${v} ${className}`} {...p} />
}

export const PageHeader = ({ title, sub, actions }) => (
  <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      {sub && <p className="text-slate-500 mt-0.5">{sub}</p>}
    </div>
    {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
  </div>
)

export const Input = ({ label, hint, className = '', ...p }) => (
  <label className={`block ${className}`}>
    {label && <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>}
    <input className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200" {...p} />
    {hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
  </label>
)

export const Select = ({ label, options, className = '', ...p }) => (
  <label className={`block ${className}`}>
    {label && <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>}
    <select className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white" {...p}>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  </label>
)

export const Bar = ({ value, tone = 'bg-indigo-500' }) => (
  <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${tone}`} style={{ width: `${Math.min(value, 100)}%` }} /></div>
)

export const Table = ({ head, children }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead><tr>{head.map(h => <th key={h} className="text-left text-xs font-medium text-slate-500 px-3 py-2 border-b border-slate-200 whitespace-nowrap">{h}</th>)}</tr></thead>
      <tbody className="[&_td]:px-3 [&_td]:py-2.5 [&_td]:border-b [&_td]:border-slate-100">{children}</tbody>
    </table>
  </div>
)

export const Kpi = ({ label, value, note, tone }) => (
  <Card className="p-4">
    <div className="text-xs text-slate-500">{label}</div>
    <div className="text-2xl font-semibold mt-1">{value}</div>
    {note && <div className={`text-xs mt-1 ${tone === 'bad' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : 'text-slate-400'}`}>{note}</div>}
  </Card>
)
