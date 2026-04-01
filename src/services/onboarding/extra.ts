import type { Json } from './json'
import type {
  ClientProfileRow,
  ContactPreference,
  OnboardingExtra,
  OnboardingPayload,
  OnboardingState,
  UserPreferencesRow,
} from './types'

function isRecord(v: Json): v is Record<string, Json> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

/** Parse jsonb `extra` into typed onboarding fields (missing keys = undefined). */
export function parseOnboardingExtra(raw: Json): OnboardingExtra {
  if (!isRecord(raw)) return {}
  const o = raw
  const styleRaw = o.style_tags
  const style_tags = Array.isArray(styleRaw)
    ? styleRaw.filter((x): x is string => typeof x === 'string')
    : undefined
  const cp = o.contact_preference
  const contact_preference =
    cp === 'text' || cp === 'call' || cp === 'email' ? (cp as ContactPreference) : undefined
  const inf = o.inspiration_file_name
  const inspiration_file_name =
    typeof inf === 'string' ? inf : inf === null ? null : undefined

  const cem = o.contact_email
  const contact_email = typeof cem === 'string' ? cem : undefined

  return { style_tags, contact_preference, inspiration_file_name, contact_email }
}

/** Merge onboarding `extra` with existing jsonb (shallow merge of onboarding keys only). */
export function mergeOnboardingExtra(existing: Json, patch: OnboardingExtra): Json {
  const base = isRecord(existing) ? { ...existing } : {}
  if (patch.style_tags !== undefined) base.style_tags = patch.style_tags as unknown as Json
  if (patch.contact_preference !== undefined) {
    base.contact_preference = patch.contact_preference as unknown as Json
  }
  if (patch.inspiration_file_name !== undefined) {
    base.inspiration_file_name = patch.inspiration_file_name as unknown as Json
  }
  if (patch.contact_email !== undefined) {
    base.contact_email = patch.contact_email as unknown as Json
  }
  return base as Json
}

/** Map onboarding form payload into `extra` patch (camelCase → snake_case). */
export function payloadToExtraPatch(payload: OnboardingPayload): OnboardingExtra {
  const patch: OnboardingExtra = {}
  if (payload.styleTags !== undefined) patch.style_tags = payload.styleTags
  if (payload.contactPreference !== undefined) {
    patch.contact_preference = payload.contactPreference ?? undefined
  }
  if (payload.inspirationFileName !== undefined) {
    patch.inspiration_file_name = payload.inspirationFileName
  }
  if (payload.email !== undefined) {
    const t = payload.email?.trim()
    patch.contact_email = t || undefined
  }
  return patch
}

/** Build `OnboardingState` fields from profile + preferences rows. */
export function deriveOnboardingState(
  profile: ClientProfileRow | null,
  preferences: UserPreferencesRow | null,
  authEmail: string | null,
): Omit<OnboardingState, 'profile' | 'preferences'> {
  const extra = parseOnboardingExtra(preferences?.extra ?? {})
  const auth = authEmail?.trim() ?? ''
  const fromExtra = extra.contact_email?.trim() ?? ''
  return {
    firstName: profile?.display_name?.trim() ?? '',
    categories: preferences?.preferred_categories?.length
      ? [...preferences.preferred_categories]
      : [],
    styleTags: extra.style_tags ?? [],
    /** Filename/label metadata only in MVP — see `inspirationMvp.ts`. */
    inspirationFileName:
      typeof extra.inspiration_file_name === 'string' ? extra.inspiration_file_name : '',
    location: profile?.city?.trim() ?? '',
    contactPreference: extra.contact_preference ?? null,
    /** Prefer linked Auth email; fall back to contact step stored in `extra.contact_email`. */
    email: auth || fromExtra,
    phone: profile?.phone?.trim() ?? '',
    isComplete: Boolean(preferences?.onboarding_completed_at),
  }
}
