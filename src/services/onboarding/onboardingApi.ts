import type { SupabaseClient } from '@supabase/supabase-js'
import { deriveOnboardingState, mergeOnboardingExtra, payloadToExtraPatch } from './extra'
import type { Json } from './json'
import { authError, fail, ok, validationError, type OnboardingServiceResult } from './result'
import type {
  ClientProfileRow,
  OnboardingPayload,
  OnboardingState,
  UserPreferencesRow,
} from './types'

async function requireUserId(client: SupabaseClient): Promise<OnboardingServiceResult<string>> {
  const { data, error } = await client.auth.getUser()
  if (error) return fail(authError(error.message))
  if (!data.user) return fail(authError('Not authenticated'))
  return ok(data.user.id)
}

/** Auth email, or validated payload email after contact step (stored in `extra.contact_email`). */
function emailForCompletion(
  authEmail: string | null | undefined,
  payload: OnboardingPayload,
): string | null {
  const a = authEmail?.trim()
  if (a) return a
  const p = payload.email?.trim()
  if (p && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p)) return p
  return null
}

/**
 * Supabase-backed onboarding API. Pass any `SupabaseClient` (web `createBrowserClient`, mobile singleton).
 *
 * - Profile: `display_name` ← firstName, `city` ← location
 * - Preferences: `preferred_categories`, `extra` (style_tags, contact_preference, contact_email, inspiration_file_name), `onboarding_completed_at`
 * - Inspiration: see `./inspirationMvp.ts` — `extra.inspiration_file_name` is MVP metadata only (no Storage upload here).
 */
export function createOnboardingApi(client: SupabaseClient) {
  async function buildOnboardingState(
    profile: ClientProfileRow | null,
    preferences: UserPreferencesRow | null,
  ): Promise<OnboardingState> {
    const {
      data: { user },
    } = await client.auth.getUser()
    const derived = deriveOnboardingState(profile, preferences, user?.email ?? null)
    return {
      profile,
      preferences,
      ...derived,
    }
  }

  async function getCurrentUserProfile(): Promise<OnboardingServiceResult<ClientProfileRow | null>> {
    const uidRes = await requireUserId(client)
    if (uidRes.error) return uidRes
    const uid = uidRes.data

    const { data, error } = await client.from('profiles').select('*').eq('id', uid).maybeSingle()

    if (error) return fail(error)
    return ok((data as ClientProfileRow | null) ?? null)
  }

  async function getUserPreferences(): Promise<OnboardingServiceResult<UserPreferencesRow | null>> {
    const uidRes = await requireUserId(client)
    if (uidRes.error) return uidRes
    const uid = uidRes.data

    const { data, error } = await client
      .from('user_preferences')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle()

    if (error) return fail(error)
    return ok((data as UserPreferencesRow | null) ?? null)
  }

  async function getOnboardingState(): Promise<OnboardingServiceResult<OnboardingState>> {
    const [pRes, prefRes] = await Promise.all([getCurrentUserProfile(), getUserPreferences()])
    if (pRes.error) return pRes
    if (prefRes.error) return prefRes

    const profile = pRes.data
    const preferences = prefRes.data

    return ok(await buildOnboardingState(profile, preferences))
  }

  /** Partial save — does not set `onboarding_completed_at`. */
  async function saveOnboardingProgress(
    payload: OnboardingPayload,
  ): Promise<OnboardingServiceResult<OnboardingState>> {
    const uidRes = await requireUserId(client)
    if (uidRes.error) return uidRes
    const uid = uidRes.data

    const { data: existingProfile, error: profileErr } = await client
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle()
    if (profileErr) return fail(profileErr)

    const { data: existingPrefs, error: prefsErr } = await client
      .from('user_preferences')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle()
    if (prefsErr) return fail(prefsErr)

    const profilePatch: Record<string, unknown> = {}
    if (payload.firstName !== undefined) profilePatch.display_name = payload.firstName.trim() || null
    if (payload.location !== undefined) profilePatch.city = payload.location.trim() || null
    if (payload.phone !== undefined) profilePatch.phone = payload.phone.trim() || null

    let profileOut: ClientProfileRow | null = (existingProfile as ClientProfileRow | null) ?? null

    if (Object.keys(profilePatch).length > 0) {
      if (!existingProfile) {
        const insertRow = {
          id: uid,
          display_name: (profilePatch.display_name as string | null) ?? null,
          city: (profilePatch.city as string | null) ?? null,
          phone: (profilePatch.phone as string | null) ?? null,
          account_type: 'client' as const,
        }
        const { data: inserted, error: insErr } = await client
          .from('profiles')
          .insert(insertRow)
          .select()
          .single()
        if (insErr) return fail(insErr)
        profileOut = inserted as ClientProfileRow
      } else {
        const { data: updated, error: updErr } = await client
          .from('profiles')
          .update(profilePatch)
          .eq('id', uid)
          .select()
          .single()
        if (updErr) return fail(updErr)
        profileOut = updated as ClientProfileRow
      }
    }

    const extraPatch = payloadToExtraPatch(payload)
    const mergedExtra = mergeOnboardingExtra(
      (existingPrefs?.extra as Json) ?? {},
      extraPatch,
    )

    const preferredCategories =
      payload.categories !== undefined
        ? payload.categories
        : (existingPrefs?.preferred_categories as string[] | undefined) ?? []

    const upsertPrefs = {
      user_id: uid,
      preferred_categories: preferredCategories,
      extra: mergedExtra,
      onboarding_completed_at: (existingPrefs?.onboarding_completed_at as string | null) ?? null,
    }

    const { data: prefRow, error: upsertErr } = await client
      .from('user_preferences')
      .upsert(upsertPrefs, { onConflict: 'user_id' })
      .select()
      .single()

    if (upsertErr) return fail(upsertErr)

    return ok(await buildOnboardingState(profileOut, prefRow as UserPreferencesRow))
  }

  /** Final completion — sets `onboarding_completed_at` and persists all provided fields. */
  async function completeOnboarding(
    payload: OnboardingPayload,
  ): Promise<OnboardingServiceResult<OnboardingState>> {
    const first = payload.firstName?.trim() ?? ''
    const loc = payload.location?.trim() ?? ''
    const cats = payload.categories ?? []
    if (!first) return fail(validationError('firstName is required to complete onboarding'))
    if (cats.length === 0) return fail(validationError('At least one category is required'))
    if (!loc) return fail(validationError('location is required to complete onboarding'))
    if (payload.contactPreference == null) {
      return fail(validationError('contactPreference is required to complete onboarding'))
    }
    const styleOk = (payload.styleTags?.length ?? 0) > 0
    const inspOk = Boolean((payload.inspirationFileName ?? '').trim())
    if (!styleOk && !inspOk) {
      return fail(
        validationError('Add at least one style tag or an inspiration reference (optional label)'),
      )
    }
    const phone = payload.phone?.trim() ?? ''
    if (!phone) return fail(validationError('phone is required to complete onboarding'))

    const uidRes = await requireUserId(client)
    if (uidRes.error) return uidRes
    const uid = uidRes.data

    const { data: existingProfile, error: profileErr } = await client
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle()
    if (profileErr) return fail(profileErr)

    const { data: existingPrefs, error: prefsErr } = await client
      .from('user_preferences')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle()
    if (prefsErr) return fail(prefsErr)

    const {
      data: { user: authUser },
    } = await client.auth.getUser()
    if (!emailForCompletion(authUser?.email, payload)) {
      return fail(validationError('Add your email and password in the previous steps'))
    }

    const profilePatch = {
      display_name: first || null,
      city: loc || null,
      phone: phone || null,
    }

    let profileOut: ClientProfileRow | null = (existingProfile as ClientProfileRow | null) ?? null

    if (!existingProfile) {
      const { data: inserted, error: insErr } = await client
        .from('profiles')
        .insert({
          id: uid,
          ...profilePatch,
          account_type: 'client',
        })
        .select()
        .single()
      if (insErr) return fail(insErr)
      profileOut = inserted as ClientProfileRow
    } else {
      const { data: updated, error: updErr } = await client
        .from('profiles')
        .update(profilePatch)
        .eq('id', uid)
        .select()
        .single()
      if (updErr) return fail(updErr)
      profileOut = updated as ClientProfileRow
    }

    const extraPatch = payloadToExtraPatch(payload)
    const mergedExtra = mergeOnboardingExtra((existingPrefs?.extra as Json) ?? {}, extraPatch)

    const completedAt = new Date().toISOString()

    const { data: prefRow, error: upsertErr } = await client
      .from('user_preferences')
      .upsert(
        {
          user_id: uid,
          preferred_categories: cats,
          extra: mergedExtra,
          onboarding_completed_at: completedAt,
        },
        { onConflict: 'user_id' },
      )
      .select()
      .single()

    if (upsertErr) return fail(upsertErr)

    return ok(await buildOnboardingState(profileOut, prefRow as UserPreferencesRow))
  }

  return {
    getCurrentUserProfile,
    getUserPreferences,
    getOnboardingState,
    saveOnboardingProgress,
    completeOnboarding,
  }
}

export type OnboardingApi = ReturnType<typeof createOnboardingApi>
