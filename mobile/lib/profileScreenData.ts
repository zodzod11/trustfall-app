import { BUCKETS, getSignedUrlForPath } from '@/lib/trustfallStorage'
import { getMockProfileAvatarUrl } from '@/lib/mockProfileAvatar'
import { supabase } from '@/lib/supabase'
import type { ProfileRow } from '@/types/database/rows'
import { parseOnboardingExtra } from '../../src/services/onboarding/extra'
import type { ContactPreference } from '../../src/services/onboarding/types'

/** Profile tab: signed-in user + `profiles` + `user_preferences`. */
export type OnboardingPreferencesSummary = {
  firstName: string
  categories: string[]
  styleTags: string[]
  inspirationFileName: string
  location: string
  contactPreference: ContactPreference | null
  email: string
  phone: string
  completedAt: string | null
}

export type ProfileScreenModel = {
  displayName: string
  email: string
  phone: string
  city: string
  preferredCategories: string[]
  budgetLabel: string | null
  budgetMin: string
  budgetMax: string
  /** Ready for `Image` `source={{ uri }}` — signed URL or absolute URL from `profiles.avatar_url`. */
  avatarDisplayUrl: string | null
  onboarding: OnboardingPreferencesSummary
}

function initialsFromDisplayName(name: string): string {
  const t = name.trim()
  if (!t) return '?'
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2)
  }
  return t.slice(0, 2).toUpperCase()
}

export function profileInitials(displayName: string): string {
  return initialsFromDisplayName(displayName)
}

function formatBudget(
  min: string | null | undefined,
  max: string | null | undefined,
): string | null {
  const a = min != null && min !== '' ? Number(min) : NaN
  const b = max != null && max !== '' ? Number(max) : NaN
  if (!Number.isFinite(a) && !Number.isFinite(b)) return null
  if (Number.isFinite(a) && Number.isFinite(b)) {
    return `$${Math.round(a)} – $${Math.round(b)}`
  }
  if (Number.isFinite(a)) return `From $${Math.round(a)}`
  if (Number.isFinite(b)) return `Up to $${Math.round(b)}`
  return null
}

/**
 * `profiles.avatar_url` stores either an `https://` URL or an object key inside the `avatars` bucket
 * (e.g. `{user_id}/avatar.jpg`). Returns a displayable URI or null.
 */
export async function resolveProfileAvatarDisplayUrl(
  avatarUrl: string | null | undefined,
): Promise<string | null> {
  const raw = avatarUrl?.trim()
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return raw
  const { url, error } = await getSignedUrlForPath(BUCKETS.avatars, raw, 86_400)
  if (error || !url) return null
  return url
}

/** `null` = signed out; otherwise current user + DB profile/prefs. */
export async function fetchProfileScreenModel(): Promise<ProfileScreenModel | null> {
  const { data: authData, error: authErr } = await supabase.auth.getUser()
  if (authErr || !authData.user) return null

  const user = authData.user
  const uid = user.id

  const [profileRes, prefsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, phone, city, budget_min, budget_max, avatar_url')
      .eq('id', uid)
      .maybeSingle(),
    supabase
      .from('user_preferences')
      .select('preferred_categories, onboarding_completed_at, extra')
      .eq('user_id', uid)
      .maybeSingle(),
  ])

  const p = profileRes.data as
    | Pick<
        ProfileRow,
        'display_name' | 'phone' | 'city' | 'budget_min' | 'budget_max' | 'avatar_url'
      >
    | null
  const email = user.email?.trim() ?? ''
  const meta = user.user_metadata as Record<string, unknown> | undefined
  const metaName =
    typeof meta?.full_name === 'string'
      ? meta.full_name.trim()
      : typeof meta?.name === 'string'
        ? meta.name.trim()
        : ''

  const displayName =
    p?.display_name?.trim() || metaName || (email ? email.split('@')[0] : '') || 'You'

  const cats = Array.isArray(prefsRes.data?.preferred_categories)
    ? (prefsRes.data!.preferred_categories as string[])
    : []
  const onboardingExtra = parseOnboardingExtra(prefsRes.data?.extra ?? {})

  const onboardingEmail = onboardingExtra.contact_email?.trim() || email

  const avatarDisplayUrl =
    (await resolveProfileAvatarDisplayUrl(p?.avatar_url)) ??
    getMockProfileAvatarUrl(`${uid}:${displayName || email}`)

  return {
    displayName,
    email,
    phone: p?.phone?.trim() ?? '',
    city: p?.city?.trim() ?? '',
    preferredCategories: cats,
    budgetLabel: formatBudget(p?.budget_min, p?.budget_max),
    budgetMin: p?.budget_min?.trim() ?? '',
    budgetMax: p?.budget_max?.trim() ?? '',
    avatarDisplayUrl,
    onboarding: {
      firstName: p?.display_name?.trim() ?? '',
      categories: cats,
      styleTags: onboardingExtra.style_tags ?? [],
      inspirationFileName:
        typeof onboardingExtra.inspiration_file_name === 'string'
          ? onboardingExtra.inspiration_file_name.trim()
          : '',
      location: p?.city?.trim() ?? '',
      contactPreference: onboardingExtra.contact_preference ?? null,
      email: onboardingEmail,
      phone: p?.phone?.trim() ?? '',
      completedAt: prefsRes.data?.onboarding_completed_at ?? null,
    },
  }
}
