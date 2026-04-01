/**
 * `user_preferences` — upsert for the signed-in user.
 */

import { supabase } from '@/lib/supabase'
import type { UserPreferencesRow } from '@/types/database'
import type { SaveUserPreferencesInput } from '@/domain/user'
import { authPostgrestError, fail, ok, validationError, type UserServiceResult } from './result'

export async function saveUserPreferences(
  input: SaveUserPreferencesInput,
): Promise<UserServiceResult<UserPreferencesRow>> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr) return fail(authPostgrestError(userErr.message))
  if (!userData.user) return fail(authPostgrestError('Not authenticated'))

  const uid = userData.user.id
  const row = {
    user_id: uid,
    onboarding_completed_at: input.onboarding_completed_at ?? null,
    preferred_categories: input.preferred_categories ?? [],
    extra: input.extra ?? {},
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert(row, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return fail(error)
  return ok(data as UserPreferencesRow)
}
