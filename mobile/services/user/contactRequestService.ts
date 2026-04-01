/**
 * `contact_requests` — client messages to a professional for a specific portfolio item.
 */

import { supabase } from '@/lib/supabase'
import type { ContactRequestRow } from '@/types/database'
import type { CreateContactRequestInput } from '@/domain/user'
import { authPostgrestError, fail, ok, validationError, type UserServiceResult } from './result'
import { requireUuid } from './validation'

const MESSAGE_MIN = 1
const MESSAGE_MAX = 8000

function validateContactRequest(input: CreateContactRequestInput): string | null {
  const pe = requireUuid('professional_id', input.professional_id)
  if (pe) return pe
  const pie = requireUuid('portfolio_item_id', input.portfolio_item_id)
  if (pie) return pie

  const msg = input.message?.trim() ?? ''
  if (msg.length < MESSAGE_MIN) return 'message is required'
  if (msg.length > MESSAGE_MAX) return `message must be at most ${MESSAGE_MAX} characters`

  const pathMax = 2048
  if (input.pro_look_snapshot_path != null && input.pro_look_snapshot_path.length > pathMax) {
    return 'pro_look_snapshot_path exceeds maximum length'
  }
  if (input.inspiration_image_path != null && input.inspiration_image_path.length > pathMax) {
    return 'inspiration_image_path exceeds maximum length'
  }
  if (input.current_photo_path != null && input.current_photo_path.length > pathMax) {
    return 'current_photo_path exceeds maximum length'
  }

  return null
}

export async function createContactRequest(
  input: CreateContactRequestInput,
): Promise<UserServiceResult<ContactRequestRow>> {
  const v = validateContactRequest(input)
  if (v) return fail(validationError(v))

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr) return fail(authPostgrestError(userErr.message))
  if (!userData.user) return fail(authPostgrestError('Not authenticated'))

  const insert = {
    user_id: userData.user.id,
    professional_id: input.professional_id,
    portfolio_item_id: input.portfolio_item_id,
    message: input.message.trim(),
    preferred_date_text: input.preferred_date_text?.trim() ?? null,
    client_name: input.client_name?.trim() ?? null,
    client_email: input.client_email?.trim() ?? null,
    client_phone: input.client_phone?.trim() ?? null,
    pro_look_snapshot_path: input.pro_look_snapshot_path?.trim() || null,
    inspiration_image_path: input.inspiration_image_path?.trim() || null,
    current_photo_path: input.current_photo_path?.trim() || null,
    status: 'pending' as const,
  }

  const { data, error } = await supabase.from('contact_requests').insert(insert).select().single()
  if (error) return fail(error)
  return ok(data as ContactRequestRow)
}

export async function updateContactRequestImagePaths(
  contactRequestId: string,
  paths: {
    inspiration_image_path?: string | null
    current_photo_path?: string | null
  },
): Promise<UserServiceResult<void>> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr) return fail(authPostgrestError(userErr.message))
  if (!userData.user) return fail(authPostgrestError('Not authenticated'))

  const { error } = await supabase
    .from('contact_requests')
    .update({
      ...(paths.inspiration_image_path !== undefined
        ? { inspiration_image_path: paths.inspiration_image_path }
        : {}),
      ...(paths.current_photo_path !== undefined ? { current_photo_path: paths.current_photo_path } : {}),
    })
    .eq('id', contactRequestId)

  if (error) return fail(error)
  return ok(undefined)
}
