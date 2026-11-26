import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// WEB_PORT / TRACKER_API let a second copy run beside the usual one (defaults: 5180 -> API on 4000).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: +(process.env.WEB_PORT || 5180), strictPort: true, proxy: { '/api': process.env.TRACKER_API || 'http://localhost:4000' } },
})
