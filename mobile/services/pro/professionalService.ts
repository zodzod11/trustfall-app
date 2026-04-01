/**
 * Signed-in professional: create/update/fetch the `professionals` row owned by auth.uid().
 */

import { supabase } from '@/lib/supabase'
import type { ProfessionalInsert, ProfessionalRow, ProfessionalUpdate } from '@/types/database'
import type { CreateProfessionalInput, UpdateProfessionalInput } from '@/domain/pro'
import { authPostgrestError, fail, ok, type ProServiceResult } from './result'

function toInsert(input: CreateProfessionalInput, ownerUserId: string): ProfessionalInsert {
  return {
    slug: input.slug.trim().toLowerCase(),
    display_name: input.display_name,
    title: input.title,
    category: input.category,
    city: input.city,
    rating: input.rating ?? null,
    review_count: input.review_count ?? 0,
    years_experience: input.years_experience ?? null,
    about: input.about ?? null,
    booking_phone: input.booking_phone ?? null,
    booking_email: input.booking_email ?? null,
    published: input.published ?? true,
    owner_user_id: ownerUserId,
  }
}

function toUpdate(input: UpdateProfessionalInput): ProfessionalUpdate {
  const u: ProfessionalUpdate = {}
  if (input.slug !== undefined) u.slug = input.slug.trim().toLowerCase()
  if (input.display_name !== undefined) u.display_name = input.display_name
  if (input.title !== undefined) u.title = input.title
  if (input.category !== undefined) u.category = input.category
  if (input.city !== undefined) u.city = input.city
  if (input.rating !== undefined) u.rating = input.rating
  if (input.review_count !== undefined) u.review_count = input.review_count
  if (input.years_experience !== undefined) u.years_experience = input.years_experience
  if (input.about !== undefined) u.about = input.about
  if (input.booking_phone !== undefined) u.booking_phone = input.booking_phone
  if (input.booking_email !== undefined) u.booking_email = input.booking_email
  if (input.published !== undefined) u.published = input.published
  return u
}

/** Create the catalog row for the current user (sets owner_user_id = auth user). */
export async function createMyProfessional(
  input: CreateProfessionalInput,
): Promise<ProServiceResult<ProfessionalRow>> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr) return fail(authPostgrestError(userErr.message))
  if (!userData.user) return fail(authPostgrestError('Not authenticated'))
  const row = toInsert(input, userData.user.id)
  const { data, error } = await supabase.from('professionals').insert(row).select().single()
  if (error) return fail(error)
  return ok(data as ProfessionalRow)
}

/** Update fields on the professional row where owner_user_id = current user. */
export async function updateMyProfessional(
  professionalId: string,
  patch: UpdateProfessionalInput,
): Promise<ProServiceResult<ProfessionalRow | null>> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr) return fail(authPostgrestError(userErr.message))
  if (!userData.user) return fail(authPostgrestError('Not authenticated'))
  const update = toUpdate(patch)
  if (Object.keys(update).length === 0) {
    return getMyProfessional()
  }
  const { data, error } = await supabase
    .from('professionals')
    .update(update)
    .eq('id', professionalId)
    .eq('owner_user_id', userData.user.id)
    .select()
    .single()
  if (error) return fail(error)
  return ok(data as ProfessionalRow)
}

/** Fetch the professional row owned by the current user (at most one expected). */
export async function getMyProfessional(): Promise<ProServiceResult<ProfessionalRow | null>> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr) return fail(authPostgrestError(userErr.message))
  if (!userData.user) return fail(authPostgrestError('Not authenticated'))
  const { data, error } = await supabase
    .from('professionals')
    .select('*')
    .eq('owner_user_id', userData.user.id)
    .maybeSingle()
  if (error) return fail(error)
  return ok(data as ProfessionalRow | null)
}
