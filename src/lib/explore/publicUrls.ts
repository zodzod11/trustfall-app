/**
 * Public Storage URLs for portfolio images.
 * Paths are stored in DB; bucket must be public in Supabase (see trustfall_storage migration).
 */
const DEFAULT_BUCKET = 'portfolio'

function bucketName(): string {
  return import.meta.env.VITE_SUPABASE_PORTFOLIO_BUCKET ?? DEFAULT_BUCKET
}

function baseUrl(): string {
  const u = import.meta.env.VITE_SUPABASE_URL
  if (!u) return ''
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
