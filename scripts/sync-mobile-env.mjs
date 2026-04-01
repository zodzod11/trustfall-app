/**
 * Writes `mobile/.env` from repo root `.env.local` so Metro can inline
 * `EXPO_PUBLIC_*` on all platforms (including web, where `Constants.expoConfig.extra` may be empty).
 *
 * Usage: `npm run mobile:sync-env` from repo root, then restart Expo with `npx expo start --clear`.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const srcPath = path.join(root, '.env.local')
const outPath = path.join(root, 'mobile', '.env')

if (!fs.existsSync(srcPath)) {
  console.error('Missing .env.local at repo root. Copy .env.example to .env.local and add Supabase keys.')
  process.exit(1)
}

const raw = fs.readFileSync(srcPath, 'utf8')
const map = {}
for (const line of raw.split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq === -1) continue
  const k = t.slice(0, eq).trim()
  let v = t.slice(eq + 1).trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1)
  }
  map[k] = v
}

const url = map.VITE_SUPABASE_URL || map.EXPO_PUBLIC_SUPABASE_URL
const key =
  map.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || map.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
const notify =
  map.EXPO_PUBLIC_NOTIFY_API_URL ||
  map.VITE_NOTIFY_API_URL ||
  'http://localhost:8787/api/notify-request'

if (!url || !key) {
  console.error('Could not find VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY in .env.local')
  process.exit(1)
}

const out = [
  '# Synced from repo root .env.local — run: npm run mobile:sync-env',
  '# Restart Expo after changes: npx expo start --clear',
  '',
  `EXPO_PUBLIC_SUPABASE_URL=${url}`,
  `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=${key}`,
  `EXPO_PUBLIC_NOTIFY_API_URL=${notify}`,
  '',
].join('\n')

fs.writeFileSync(outPath, out, 'utf8')
console.log(`Wrote ${path.relative(root, outPath)}`)
