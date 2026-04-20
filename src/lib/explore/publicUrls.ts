/**
 * Public Storage URLs for portfolio images.
 * Paths are stored in DB; bucket must be public in Supabase (see trustfall_storage migration).
 *
 * Uses `process.env` only — no `import.meta` (Hermes / Metro cannot compile it). Expo inlines
 * `EXPO_PUBLIC_*`; Vite gets `VITE_*` via `define` in vite.config.ts.
 */
const DEFAULT_BUCKET = 'portfolio'

function envFirst(...keys: string[]): string {
  const p = typeof process !== 'undefined' && process.env ? process.env : {}
  for (const k of keys) {
    const v = p[k]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

function bucketName(): string {
  return (
    envFirst('EXPO_PUBLIC_SUPABASE_PORTFOLIO_BUCKET', 'VITE_SUPABASE_PORTFOLIO_BUCKET') ||
    DEFAULT_BUCKET
  )
}

function baseUrl(): string {
  const u = envFirst('EXPO_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL')
  return u.replace(/\/$/, '')
}

export function portfolioImagePublicUrl(path: string | null | undefined): string {
  if (!path?.trim()) {
    return ''
  }
  const p = path.trim()
  if (p.startsWith('http://') || p.startsWith('https://')) {
    return p
  }
  const root = baseUrl()
  if (!root) return p
  const key = p.replace(/^\/+/, '')
  return `${root}/storage/v1/object/public/${bucketName()}/${key}`
}
