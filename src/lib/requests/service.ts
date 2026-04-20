import type { SupabaseClient } from '@supabase/supabase-js'
import {
  REQUEST_IMAGE_BUCKET,
  type CreateRequestInput,
  type NotifyProviderResult,
  type RequestHistoryQuery,
  type RequestImagePaths,
  type RequestImageSource,
  type RequestImageSources,
  type RequestRecord,
  type RequestRecordWithAssets,
  type RequestServiceResult,
  type RequestStatus,
  type RequestSubmitPayload,
} from './types'

// Accept UUID-shaped deterministic seed IDs even if they don't use RFC version/variant bits.
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const PATH_MAX = 2048
const MESSAGE_MAX = 8000
const REQUEST_SCHEMA_COLUMNS = [
  'match_request_id',
  'request_type',
  'provider_name_snapshot',
  'portfolio_title_snapshot',
  'category_snapshot',
  'portfolio_image_url_snapshot',
  'provider_notified_at',
  'notified_channels',
  'notification_error',
] as const

function ok<T>(data: T): RequestServiceResult<T> {
  return { data, error: null }
}

function fail<T>(error: string): RequestServiceResult<T> {
  return { data: null, error }
}

function isMissingColumnError(message: string): boolean {
  const lower = message.toLowerCase()
  return REQUEST_SCHEMA_COLUMNS.some((column) => lower.includes(`'${column}'`.toLowerCase()))
}

function isLegacyStatusConstraintError(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes('contact_requests_status_check') || lower.includes('status')
}

function isLegacyContactRequestSchemaError(message: string): boolean {
  return isMissingColumnError(message) || isLegacyStatusConstraintError(message)
}

function normalizeLegacyStatus(value: string | null | undefined): RequestStatus {
  switch ((value ?? '').trim()) {
    case 'pending':
      return 'submitted'
    case 'accepted':
      return 'responded'
    case 'declined':
      return 'closed'
    case 'cancelled':
      return 'cancelled'
    case 'submitted':
    case 'notified':
    case 'viewed':
    case 'responded':
    case 'closed':
      return value as RequestStatus
    default:
      return 'submitted'
  }
}

function normalizeRequestRow(row: Record<string, unknown>): RequestRecord {
  return {
    id: String(row.id ?? ''),
    user_id: String(row.user_id ?? ''),
    professional_id: typeof row.professional_id === 'string' ? row.professional_id : null,
    portfolio_item_id: typeof row.portfolio_item_id === 'string' ? row.portfolio_item_id : null,
    match_request_id: typeof row.match_request_id === 'string' ? row.match_request_id : null,
    request_type: row.request_type === 'match' ? 'match' : 'direct',
    message: typeof row.message === 'string' ? row.message : '',
    preferred_date_text:
      typeof row.preferred_date_text === 'string' ? row.preferred_date_text : null,
    client_name: typeof row.client_name === 'string' ? row.client_name : null,
    client_email: typeof row.client_email === 'string' ? row.client_email : null,
    client_phone: typeof row.client_phone === 'string' ? row.client_phone : null,
    provider_name_snapshot:
      typeof row.provider_name_snapshot === 'string' ? row.provider_name_snapshot : null,
    portfolio_title_snapshot:
      typeof row.portfolio_title_snapshot === 'string' ? row.portfolio_title_snapshot : null,
    category_snapshot: typeof row.category_snapshot === 'string' ? row.category_snapshot : null,
    portfolio_image_url_snapshot:
      typeof row.portfolio_image_url_snapshot === 'string'
        ? row.portfolio_image_url_snapshot
        : null,
    pro_look_snapshot_path:
      typeof row.pro_look_snapshot_path === 'string' ? row.pro_look_snapshot_path : null,
    inspiration_image_path:
      typeof row.inspiration_image_path === 'string' ? row.inspiration_image_path : null,
    current_photo_path:
      typeof row.current_photo_path === 'string' ? row.current_photo_path : null,
    status: normalizeLegacyStatus(typeof row.status === 'string' ? row.status : null),
    provider_notified_at:
      typeof row.provider_notified_at === 'string' ? row.provider_notified_at : null,
    notified_channels: Array.isArray(row.notified_channels)
      ? row.notified_channels.filter((value): value is string => typeof value === 'string')
      : [],
    notification_error:
      typeof row.notification_error === 'string' ? row.notification_error : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : '',
  }
}

export function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`
}

function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_PATTERN.test(value.trim()))
}

export function canonicalUuidOrNull(value: string | null | undefined): string | null {
  return isUuid(value) ? value.trim() : null
}

async function getCurrentUserId(supabase: SupabaseClient): Promise<RequestServiceResult<string>> {
  const { data, error } = await supabase.auth.getUser()
  if (error) return fail(error.message)
  if (!data.user) return fail('Not authenticated')
  return ok(data.user.id)
}

function cleanText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : null
}

function isByteArrayImageSource(
  source: RequestImageSource,
): source is { bytes: ArrayBuffer; filename?: string; contentType?: string } {
  return typeof source === 'object' && source !== null && 'bytes' in source
}

async function fetchProfessionalNameMap(
  supabase: SupabaseClient,
  professionalIds: Array<string | null>,
): Promise<Map<string, string>> {
  const ids = [...new Set(professionalIds.filter((value): value is string => Boolean(cleanText(value))))]
  if (ids.length === 0) return new Map()

  const { data, error } = await supabase.from('professionals').select('id, display_name').in('id', ids)
  if (error || !data) return new Map()

  const nameMap = new Map<string, string>()
  for (const row of data as Array<{ id: string; display_name: string | null }>) {
    const displayName = cleanText(row.display_name)
    if (displayName) {
      nameMap.set(row.id, displayName)
    }
  }
  return nameMap
}

function withResolvedProviderName(
  record: RequestRecord,
  professionalNameMap: Map<string, string>,
): RequestRecord {
  if (cleanText(record.provider_name_snapshot)) return record
  if (!record.professional_id) return record
  const resolvedName = professionalNameMap.get(record.professional_id)
  return resolvedName ? { ...record, provider_name_snapshot: resolvedName } : record
}

function requestImagePath(
  userId: string,
  requestId: string,
  kind: 'inspiration' | 'current',
  ext: string,
): string {
  const safeExt = ext.replace(/^\./, '').toLowerCase() || 'jpg'
  return `${userId}/contact-requests/${requestId}/${kind}.${safeExt}`
}

function extFromName(name: string): string {
  const normalized = name.toLowerCase()
  if (normalized.endsWith('.png')) return 'png'
  if (normalized.endsWith('.webp')) return 'webp'
  if (normalized.endsWith('.heic')) return 'heic'
  if (normalized.endsWith('.heif')) return 'heif'
  if (normalized.endsWith('.jpeg')) return 'jpeg'
  return 'jpg'
}

function getSourceMetadata(source: RequestImageSource): {
  filename: string
  contentType: string
  ext: string
} {
  if (typeof File !== 'undefined' && source instanceof File) {
    return {
      filename: source.name || 'image.jpg',
      contentType: source.type || 'image/jpeg',
      ext: extFromName(source.name || 'image.jpg'),
    }
  }

  if (isByteArrayImageSource(source)) {
    const filename = source.filename?.trim() || 'image.jpg'
    return {
      filename,
      contentType: source.contentType?.trim() || 'image/jpeg',
      ext: extFromName(filename),
    }
  }

  const filename = source.filename?.trim() || 'image.jpg'
  return {
    filename,
    contentType: source.contentType?.trim() || 'image/jpeg',
    ext: extFromName(filename),
  }
}

async function toUploadBody(source: RequestImageSource): Promise<Blob | File | ArrayBuffer> {
  if (typeof File !== 'undefined' && source instanceof File) return source
  if (isByteArrayImageSource(source)) return source.bytes
  const response = await fetch(source.uri)
  return response.blob()
}

async function uploadOneImage(
  supabase: SupabaseClient,
  userId: string,
  requestId: string,
  kind: 'inspiration' | 'current',
  source: RequestImageSource | null | undefined,
): Promise<RequestServiceResult<string | null>> {
  if (!source) return ok(null)

  const meta = getSourceMetadata(source)
  const path = requestImagePath(userId, requestId, kind, meta.ext)
  const body = await toUploadBody(source)
  const { error } = await supabase.storage.from(REQUEST_IMAGE_BUCKET).upload(path, body, {
    upsert: true,
    contentType: meta.contentType,
  })
  if (error) return fail(error.message)
  return ok(path)
}

export async function uploadRequestImages(
  supabase: SupabaseClient,
  userId: string,
  requestId: string,
  images: RequestImageSources = {},
): Promise<RequestServiceResult<RequestImagePaths>> {
  const inspiration = await uploadOneImage(supabase, userId, requestId, 'inspiration', images.inspiration)
  if (inspiration.error) return fail(inspiration.error)
  const current = await uploadOneImage(supabase, userId, requestId, 'current', images.current)
  if (current.error) {
    if (inspiration.data) {
      await supabase.storage.from(REQUEST_IMAGE_BUCKET).remove([inspiration.data])
    }
    return fail(current.error)
  }

  return ok({
    inspiration_image_path: inspiration.data ?? null,
    current_photo_path: current.data ?? null,
  })
}

export async function removeRequestImages(
  supabase: SupabaseClient,
  paths: RequestImagePaths,
): Promise<void> {
  const removals = [paths.inspiration_image_path, paths.current_photo_path].filter(
    (value): value is string => Boolean(value),
  )
  if (removals.length === 0) return
  await supabase.storage.from(REQUEST_IMAGE_BUCKET).remove(removals)
}

export async function createRequest(
  supabase: SupabaseClient,
  input: CreateRequestInput,
): Promise<RequestServiceResult<RequestRecord>> {
  const userIdResult = await getCurrentUserId(supabase)
  if (userIdResult.error) return fail(userIdResult.error)

  const message = input.message.trim()
  if (message.length === 0) return fail('Message is required')
  if (message.length > MESSAGE_MAX) return fail(`Message must be ${MESSAGE_MAX} characters or fewer`)

  const providerNameSnapshot = cleanText(input.providerNameSnapshot)
  if (!providerNameSnapshot) return fail('Provider snapshot is required')

  const portfolioImageUrlSnapshot = cleanText(input.portfolioImageUrlSnapshot)
  if (portfolioImageUrlSnapshot && portfolioImageUrlSnapshot.length > PATH_MAX) {
    return fail('portfolio_image_url_snapshot exceeds maximum length')
  }

  const imagePaths = input.imagePaths ?? {
    inspiration_image_path: null,
    current_photo_path: null,
  }
  if (
    imagePaths.inspiration_image_path &&
    imagePaths.inspiration_image_path.length > PATH_MAX
  ) {
    return fail('inspiration_image_path exceeds maximum length')
  }
  if (imagePaths.current_photo_path && imagePaths.current_photo_path.length > PATH_MAX) {
    return fail('current_photo_path exceeds maximum length')
  }

  const row = {
    id: input.id ?? generateRequestId(),
    user_id: userIdResult.data,
    professional_id: canonicalUuidOrNull(input.professionalId),
    portfolio_item_id: canonicalUuidOrNull(input.portfolioItemId),
    match_request_id: canonicalUuidOrNull(input.matchRequestId),
    request_type: input.requestType ?? 'direct',
    message,
    preferred_date_text: cleanText(input.preferredDateText),
    client_name: cleanText(input.clientName),
    client_email: cleanText(input.clientEmail),
    client_phone: cleanText(input.clientPhone),
    provider_name_snapshot: providerNameSnapshot,
    portfolio_title_snapshot: cleanText(input.portfolioTitleSnapshot),
    category_snapshot: cleanText(input.categorySnapshot),
    portfolio_image_url_snapshot: portfolioImageUrlSnapshot,
    pro_look_snapshot_path: cleanText(input.proLookSnapshotPath),
    inspiration_image_path: imagePaths.inspiration_image_path,
    current_photo_path: imagePaths.current_photo_path,
    status: 'submitted' as RequestStatus,
  }

  const { data, error } = await supabase.from('contact_requests').insert(row).select('*').single()
  if (!error) return ok(normalizeRequestRow((data ?? {}) as Record<string, unknown>))
  if (!isLegacyContactRequestSchemaError(error.message)) return fail(error.message)

  if (!row.professional_id || !row.portfolio_item_id) {
    return fail(
      'This request is using a catalog item that is not mapped to a live professional yet. Apply the request migration or use a UUID-backed catalog row.',
    )
  }

  const legacyRow = {
    id: row.id,
    user_id: row.user_id,
    professional_id: row.professional_id,
    portfolio_item_id: row.portfolio_item_id,
    message: row.message,
    preferred_date_text: row.preferred_date_text,
    client_name: row.client_name,
    client_email: row.client_email,
    client_phone: row.client_phone,
    pro_look_snapshot_path: row.pro_look_snapshot_path,
    inspiration_image_path: row.inspiration_image_path,
    current_photo_path: row.current_photo_path,
    status: 'pending',
  }
  const legacyInsert = await supabase.from('contact_requests').insert(legacyRow).select('*').single()
  if (legacyInsert.error) return fail(legacyInsert.error.message)
  return ok(normalizeRequestRow((legacyInsert.data ?? {}) as Record<string, unknown>))
}

export async function updateRequestNotificationState(
  supabase: SupabaseClient,
  requestId: string,
  input: {
    status?: RequestStatus
    provider_notified_at?: string | null
    notified_channels?: string[]
    notification_error?: string | null
  },
): Promise<RequestServiceResult<RequestRecord>> {
  const userIdResult = await getCurrentUserId(supabase)
  if (userIdResult.error) return fail(userIdResult.error)

  const patch = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.provider_notified_at !== undefined
      ? { provider_notified_at: input.provider_notified_at }
      : {}),
    ...(input.notified_channels !== undefined
      ? { notified_channels: input.notified_channels }
      : {}),
    ...(input.notification_error !== undefined
      ? { notification_error: input.notification_error }
      : {}),
  }

  const { data, error } = await supabase
    .from('contact_requests')
    .update(patch)
    .eq('id', requestId)
    .eq('user_id', userIdResult.data)
    .select('*')
    .single()

  if (!error) return ok(normalizeRequestRow((data ?? {}) as Record<string, unknown>))
  if (!isLegacyContactRequestSchemaError(error.message)) return fail(error.message)

  const current = await supabase
    .from('contact_requests')
    .select('*')
    .eq('id', requestId)
    .eq('user_id', userIdResult.data)
    .single()
  if (current.error) return fail(current.error.message)
  return ok(normalizeRequestRow((current.data ?? {}) as Record<string, unknown>))
}

export async function getRequestHistory(
  supabase: SupabaseClient,
  query: RequestHistoryQuery = {},
): Promise<RequestServiceResult<RequestRecord[]>> {
  const userIdResult = await getCurrentUserId(supabase)
  if (userIdResult.error) return fail(userIdResult.error)

  const limit = Math.max(1, Math.min(query.limit ?? 50, 100))
  const offset = Math.max(0, query.offset ?? 0)

  let request = supabase
    .from('contact_requests')
    .select('*')
    .eq('user_id', userIdResult.data)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (query.status) {
    request = request.eq('status', query.status)
  }

  const { data, error } = await request
  if (error) return fail(error.message)
  const records = ((data ?? []) as Record<string, unknown>[]).map((row) => normalizeRequestRow(row))
  const professionalNameMap = await fetchProfessionalNameMap(
    supabase,
    records.map((record) => record.professional_id),
  )
  return ok(records.map((record) => withResolvedProviderName(record, professionalNameMap)))
}

async function resolvePrivatePath(
  supabase: SupabaseClient,
  path: string | null,
): Promise<string | null> {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  const { data, error } = await supabase.storage
    .from(REQUEST_IMAGE_BUCKET)
    .createSignedUrl(path, 86_400)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

export async function getRequestById(
  supabase: SupabaseClient,
  requestId: string,
): Promise<RequestServiceResult<RequestRecordWithAssets>> {
  const userIdResult = await getCurrentUserId(supabase)
  if (userIdResult.error) return fail(userIdResult.error)

  const { data, error } = await supabase
    .from('contact_requests')
    .select('*')
    .eq('id', requestId)
    .eq('user_id', userIdResult.data)
    .single()

  if (error) return fail(error.message)

  const row = normalizeRequestRow((data ?? {}) as Record<string, unknown>)
  const professionalNameMap = await fetchProfessionalNameMap(supabase, [row.professional_id])
  const resolvedRow = withResolvedProviderName(row, professionalNameMap)
  const [inspiration_image_url, current_photo_url] = await Promise.all([
    resolvePrivatePath(supabase, resolvedRow.inspiration_image_path),
    resolvePrivatePath(supabase, resolvedRow.current_photo_path),
  ])

  return ok({
    ...resolvedRow,
    inspiration_image_url,
    current_photo_url,
  })
}

export async function submitRequest(
  payload: RequestSubmitPayload,
): Promise<
  RequestServiceResult<{
    request: RequestRecord
    notify: NotifyProviderResult | null
    imagePaths: RequestImagePaths
  }>
> {
  const userIdResult = await getCurrentUserId(payload.supabase)
  if (userIdResult.error) return fail(userIdResult.error)

  const requestId = payload.request.id ?? generateRequestId()
  const images = await uploadRequestImages(
    payload.supabase,
    userIdResult.data,
    requestId,
    payload.images,
  )
  if (images.error) return fail(images.error)

  const created = await createRequest(payload.supabase, {
    ...payload.request,
    id: requestId,
    imagePaths: images.data,
  })
  if (created.error) {
    if (images.data) {
      await removeRequestImages(payload.supabase, images.data)
    }
    return fail(created.error)
  }

  return ok({
    request: created.data,
    notify: null,
    imagePaths: images.data ?? {
      inspiration_image_path: null,
      current_photo_path: null,
    },
  })
}
