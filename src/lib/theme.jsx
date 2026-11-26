// Light / dark theme. Saved on this computer; the first visit follows the operating system.
// index.html applies the saved choice before the page draws, so there is no flash.
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

const KEY = 'tracker.theme'
const initial = () => document.documentElement.dataset.theme || 'dark'

export function useTheme() {
  const [theme, setTheme] = useState(initial)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(KEY, theme)
  }, [theme])
  return [theme, () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))]
}

export function ThemeToggle({ className = '' }) {
  const [theme, toggle] = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  const Icon = theme === 'dark' ? Sun : Moon
  return (
    <button type="button" onClick={toggle} title={`Switch to ${next} theme`} aria-label={`Switch to ${next} theme`}
      className={`p-2 rounded-lg text-fg-2 hover:bg-elevated hover:text-fg transition ${className}`}>
      <Icon size={17} />
    </button>
  )
}
