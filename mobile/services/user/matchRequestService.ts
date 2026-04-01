/**
 * Match wizard persistence — `match_requests` for the signed-in user.
 * Image paths are opaque references (Storage keys or URLs); no upload logic here.
 */

import { supabase } from '@/lib/supabase'
import type { MatchRequestRow } from '@/types/database'
import type { CreateMatchRequestInput, ListMatchRequestsQuery, UpdateMatchRequestImagePathsInput } from '@/domain/user'
import { authPostgrestError, fail, ok, validationError, type UserServiceResult } from './result'
import { clampInt, isOptionalUuid, requireUuid } from './validation'

const PATH_MAX = 2048
const TEXT_MAX = 8000

function parseOptionalBudget(s: string | null | undefined): number | null {
  if (s == null || s.trim() === '') return null
  const n = Number(s.replace(/,/g, ''))
  return Number.isFinite(n) ? n : NaN
}

function validateCreateMatchRequest(input: CreateMatchRequestInput): string | null {
  if (input.saved_look_portfolio_item_id != null && input.saved_look_portfolio_item_id !== '') {
    const err = requireUuid('saved_look_portfolio_item_id', input.saved_look_portfolio_item_id)
    if (err) return err
  }
  if (input.tags && input.tags.some((t) => typeof t !== 'string' || t.length > 80)) {
    return 'Each tag must be a string (max 80 characters)'
  }
  for (const key of ['desired_style_text', 'current_state_text', 'vision_notes'] as const) {
    const v = input[key]
    if (v != null && v.length > TEXT_MAX) {
      return `${key} exceeds maximum length`
    }
  }
  const min = parseOptionalBudget(input.budget_min ?? null)
  const max = parseOptionalBudget(input.budget_max ?? null)
  if (min != null && Number.isNaN(min)) return 'budget_min is not a valid number'
  if (max != null && Number.isNaN(max)) return 'budget_max is not a valid number'
  if (min != null && max != null && min > max) return 'budget_min cannot be greater than budget_max'
  if (input.inspiration_image_path != null && input.inspiration_image_path.length > PATH_MAX) {
    return 'inspiration_image_path exceeds maximum length'
  }
  if (input.current_photo_path != null && input.current_photo_path.length > PATH_MAX) {
    return 'current_photo_path exceeds maximum length'
  }
  return null
}

function validateImagePaths(input: UpdateMatchRequestImagePathsInput): string | null {
  const hasInsp = input.inspiration_image_path !== undefined
  const hasCur = input.current_photo_path !== undefined
  if (!hasInsp && !hasCur) {
    return 'Provide at least one of inspiration_image_path or current_photo_path'
  }
  if (
    input.inspiration_image_path != null &&
    input.inspiration_image_path.length > PATH_MAX
  ) {
    return 'inspiration_image_path exceeds maximum length'
  }
  if (input.current_photo_path != null && input.current_photo_path.length > PATH_MAX) {
    return 'current_photo_path exceeds maximum length'
  }
  return null
}

export async function createMatchRequest(
  input: CreateMatchRequestInput = {},
): Promise<UserServiceResult<MatchRequestRow>> {
  const v = validateCreateMatchRequest(input)
  if (v) return fail(validationError(v))

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr) return fail(authPostgrestError(userErr.message))
  if (!userData.user) return fail(authPostgrestError('Not authenticated'))

  const insert = {
    user_id: userData.user.id,
    status: 'draft' as const,
    category: input.category?.trim() ?? null,
    location_text: input.location_text?.trim() ?? null,
    tags: input.tags?.map((t) => t.trim()).filter(Boolean) ?? [],
    vision_notes: input.vision_notes?.trim() ?? null,
    desired_style_text: input.desired_style_text?.trim() ?? null,
    current_state_text: input.current_state_text?.trim() ?? null,
    budget_min:
      input.budget_min != null && String(input.budget_min).trim() !== ''
        ? String(input.budget_min).trim()
        : null,
    budget_max:
      input.budget_max != null && String(input.budget_max).trim() !== ''
        ? String(input.budget_max).trim()
        : null,
    inspiration_image_path: input.inspiration_image_path?.trim() || null,
    current_photo_path: input.current_photo_path?.trim() || null,
    saved_look_portfolio_item_id: input.saved_look_portfolio_item_id || null,
  }

  const { data, error } = await supabase.from('match_requests').insert(insert).select().single()
  if (error) return fail(error)
  return ok(data as MatchRequestRow)
}

/**
 * Store or clear reference paths for inspiration / current look (Storage keys or URLs).
 */
export async function updateMatchRequestImagePaths(
  matchRequestId: string,
  input: UpdateMatchRequestImagePathsInput,
): Promise<UserServiceResult<MatchRequestRow>> {
  const idErr = requireUuid('matchRequestId', matchRequestId)
  if (idErr) return fail(validationError(idErr))

  const p = validateImagePaths(input)
  if (p) return fail(validationError(p))

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr) return fail(authPostgrestError(userErr.message))
  if (!userData.user) return fail(authPostgrestError('Not authenticated'))

  const patch: Record<string, string | null | undefined> = {}
  if (input.inspiration_image_path !== undefined) {
    patch.inspiration_image_path = input.inspiration_image_path?.trim() || null
  }
  if (input.current_photo_path !== undefined) {
    patch.current_photo_path = input.current_photo_path?.trim() || null
  }

  const { data, error } = await supabase
    .from('match_requests')
    .update(patch)
    .eq('id', matchRequestId)
    .eq('user_id', userData.user.id)
    .select()
    .single()

  if (error) return fail(error)
  return ok(data as MatchRequestRow)
}

export async function listMyMatchRequests(
  query: ListMatchRequestsQuery = {},
): Promise<UserServiceResult<MatchRequestRow[]>> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr) return fail(authPostgrestError(userErr.message))
  if (!userData.user) return fail(authPostgrestError('Not authenticated'))

  const limit = clampInt(query.limit ?? 50, 1, 100)
  const offset = Math.max(0, query.offset ?? 0)

  let q = supabase
    .from('match_requests')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (query.status) {
    q = q.eq('status', query.status)
  }

  const { data, error } = await q
  if (error) return fail(error)
  return ok((data ?? []) as MatchRequestRow[])
}
