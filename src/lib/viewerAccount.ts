import type { SupabaseClient } from '@supabase/supabase-js'

function formatBudgetLabel(
  min: string | null | undefined,
  max: string | null | undefined,
): string | null {
  const low = min != null && min !== '' ? Number(min) : Number.NaN
  const high = max != null && max !== '' ? Number(max) : Number.NaN
  if (!Number.isFinite(low) && !Number.isFinite(high)) return null
  if (Number.isFinite(low) && Number.isFinite(high)) {
    return `$${Math.round(low)} - $${Math.round(high)}`
  }
  if (Number.isFinite(low)) return `From $${Math.round(low)}`
  if (Number.isFinite(high)) return `Up to $${Math.round(high)}`
  return null
}

function deriveDisplayName(email: string, profileName: string | null | undefined, meta: Record<string, unknown>) {
  const direct = profileName?.trim()
  if (direct) return direct
  const fullName =
    typeof meta.full_name === 'string'
      ? meta.full_name.trim()
      : typeof meta.name === 'string'
        ? meta.name.trim()
        : ''
  if (fullName) return fullName
  return email ? email.split('@')[0] : 'You'
}

export function profileInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
  }
  return trimmed.slice(0, 2).toUpperCase()
}

export type ViewerAccountSummary = {
  displayName: string
  email: string
  phone: string
  city: string
  preferredCategories: string[]
  budgetLabel: string | null
}

export type BookingContactPrefill = {
  clientName: string
  clientEmail: string
  clientPhone: string
  source: 'session' | 'none'
}

type AccountRows = {
  display_name: string | null
  phone: string | null
  city: string | null
  budget_min: string | null
  budget_max: string | null
}

export async function fetchViewerAccountSummary(
  client: SupabaseClient,
): Promise<ViewerAccountSummary | null> {
  const { data: authData, error: authErr } = await client.auth.getUser()
  if (authErr || !authData.user) return null

  const user = authData.user
  const uid = user.id
  const [profileRes, prefsRes] = await Promise.all([
    client
      .from('profiles')
      .select('display_name, phone, city, budget_min, budget_max')
      .eq('id', uid)
      .maybeSingle(),
    client.from('user_preferences').select('preferred_categories').eq('user_id', uid).maybeSingle(),
  ])

  const profile = (profileRes.data ?? null) as AccountRows | null
  const email = user.email?.trim() ?? ''
  const meta = (user.user_metadata as Record<string, unknown> | undefined) ?? {}

  return {
    displayName: deriveDisplayName(email, profile?.display_name, meta),
    email,
    phone: profile?.phone?.trim() ?? '',
    city: profile?.city?.trim() ?? '',
    preferredCategories: Array.isArray(prefsRes.data?.preferred_categories)
      ? prefsRes.data.preferred_categories.filter((value): value is string => typeof value === 'string')
      : [],
    budgetLabel: formatBudgetLabel(profile?.budget_min, profile?.budget_max),
  }
}

export async function fetchViewerBookingContactPrefill(
  client: SupabaseClient,
): Promise<BookingContactPrefill> {
  const { data: authData, error: authErr } = await client.auth.getUser()
  if (authErr || !authData.user) {
    return { clientName: '', clientEmail: '', clientPhone: '', source: 'none' }
  }

  const user = authData.user
  const uid = user.id
  const [profileRes, prefsRes] = await Promise.all([
    client.from('profiles').select('display_name, phone').eq('id', uid).maybeSingle(),
    client.from('user_preferences').select('extra').eq('user_id', uid).maybeSingle(),
  ])

  const profile = (profileRes.data ?? null) as Pick<AccountRows, 'display_name' | 'phone'> | null
  const extra =
    prefsRes.data?.extra && typeof prefsRes.data.extra === 'object' && !Array.isArray(prefsRes.data.extra)
      ? (prefsRes.data.extra as Record<string, unknown>)
      : {}
  const email =
    user.email?.trim() ||
    (typeof extra.contact_email === 'string' ? extra.contact_email.trim() : '') ||
    ''
  const meta = (user.user_metadata as Record<string, unknown> | undefined) ?? {}

  return {
    clientName: deriveDisplayName(email, profile?.display_name, meta),
    clientEmail: email,
    clientPhone: profile?.phone?.trim() ?? '',
    source: 'session',
  }
}
