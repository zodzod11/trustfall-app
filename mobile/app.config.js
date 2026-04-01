/**
 * Loads env from `../.env.local` (same as Vite web app) and optional `mobile/.env`,
 * then exposes values on `expo.extra` for `lib/supabase.ts`, `notifyContactRequest`, and `publicUrls`.
 *
 * Restart Expo after changing env files.
 */
const fs = require('fs')
const path = require('path')

function parseEnv(filePath) {
  const out = {}
  if (!fs.existsSync(filePath)) return out
  const raw = fs.readFileSync(filePath, 'utf8')
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
    out[k] = v
  }
  return out
}

const rootLocal = parseEnv(path.join(__dirname, '..', '.env.local'))
const rootEnv = parseEnv(path.join(__dirname, '..', '.env'))
const mobileEnv = parseEnv(path.join(__dirname, '.env'))
const env = { ...rootEnv, ...rootLocal, ...mobileEnv }

const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL || ''
const supabaseKey =
  env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || ''
const notifyApiUrl =
  env.EXPO_PUBLIC_NOTIFY_API_URL ||
  env.VITE_NOTIFY_API_URL ||
  'http://localhost:8787/api/notify-request'

const appJson = require('./app.json')

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra || {}),
      supabaseUrl: supabaseUrl || undefined,
      supabaseKey: supabaseKey || undefined,
      notifyApiUrl: notifyApiUrl || undefined,
    },
  },
}
