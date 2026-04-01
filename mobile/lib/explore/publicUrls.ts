import Constants from 'expo-constants'

const DEFAULT_BUCKET = 'portfolio'

function bucketName(): string {
  return (
    process.env.EXPO_PUBLIC_SUPABASE_PORTFOLIO_BUCKET ??
    (Constants.expoConfig?.extra as { portfolioBucket?: string } | undefined)?.portfolioBucket ??
    DEFAULT_BUCKET
  )
}

function readExtra(): { supabaseUrl?: string } {
  const fromExpo = Constants.expoConfig?.extra as { supabaseUrl?: string } | undefined
  const fromManifest = (Constants as { manifest?: { extra?: { supabaseUrl?: string } } }).manifest?.extra
  return { ...fromManifest, ...fromExpo }
}

function baseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim()
  const u = fromEnv || readExtra().supabaseUrl?.trim() || ''
  return u.replace(/\/$/, '')
}

/** Storage public URL or pass through HTTPS paths (seed / external). */
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
