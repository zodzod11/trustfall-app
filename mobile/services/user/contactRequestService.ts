/**
 * `contact_requests` — client messages to a professional for a specific portfolio item.
 */

import { supabase } from '@/lib/supabase'
import type { ContactRequestRow } from '@/types/database'
import type { CreateContactRequestInput } from '@/domain/user'
import {
  createRequest,
  getRequestById,
  getRequestHistory,
} from '../../../src/lib/requests/service'
import { authPostgrestError, fail, ok, validationError, type UserServiceResult } from './result'

const MESSAGE_MIN = 1
const MESSAGE_MAX = 8000

function validateContactRequest(input: CreateContactRequestInput): string | null {
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
  const result = await createRequest(supabase, {
    professionalId: input.professional_id,
    portfolioItemId: input.portfolio_item_id,
    matchRequestId: input.match_request_id,
    requestType: input.request_type,
    message: input.message,
    preferredDateText: input.preferred_date_text,
    clientName: input.client_name,
    clientEmail: input.client_email,
    clientPhone: input.client_phone,
    providerNameSnapshot: input.provider_name_snapshot ?? null,
    portfolioTitleSnapshot: input.portfolio_title_snapshot ?? null,
    categorySnapshot: input.category_snapshot ?? null,
    portfolioImageUrlSnapshot: input.portfolio_image_url_snapshot ?? null,
    proLookSnapshotPath: input.pro_look_snapshot_path ?? null,
    imagePaths: {
      inspiration_image_path: input.inspiration_image_path ?? null,
      current_photo_path: input.current_photo_path ?? null,
    },
  })
  if (result.error) return fail(authPostgrestError(result.error))
  return ok(result.data as ContactRequestRow)
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
      ...(paths.current_photo_path !== undefined
        ? { current_photo_path: paths.current_photo_path }
        : {}),
    })
    .eq('id', contactRequestId)
    .eq('user_id', userData.user.id)

  if (error) return fail(error)
  return ok(undefined)
}

export async function listMyContactRequests(): Promise<UserServiceResult<ContactRequestRow[]>> {
  const result = await getRequestHistory(supabase, { limit: 100 })
  if (result.error) return fail(authPostgrestError(result.error))
  return ok((result.data ?? []) as ContactRequestRow[])
}

export async function getMyContactRequestById(
  contactRequestId: string,
): Promise<UserServiceResult<ContactRequestRow>> {
  const result = await getRequestById(supabase, contactRequestId)
  if (result.error) return fail(authPostgrestError(result.error))
  return ok(result.data as ContactRequestRow)
}
