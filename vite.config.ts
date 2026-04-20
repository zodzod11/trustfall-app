import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/match-run': {
        target: 'http://localhost:8788',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  /** Shared TS (e.g. publicUrls.ts) uses process.env — Hermes-safe; mirror Vite env here. */
  define: {
    'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL ?? ''),
    'process.env.VITE_SUPABASE_PORTFOLIO_BUCKET': JSON.stringify(
      env.VITE_SUPABASE_PORTFOLIO_BUCKET ?? '',
    ),
  },
}
})
