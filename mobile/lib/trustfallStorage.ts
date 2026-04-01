/**
 * Trustfall Supabase Storage — bucket names, path conventions, and upload helpers.
 *
 * Aligns with supabase/migrations/20260330150000_trustfall_storage.sql:
 *   • portfolio        — {professional_id}/{portfolio_item_id}/{filename}
 *   • client-uploads   — {user_id}/... (private; first segment must auth.uid())
 *   • avatars          — {user_id}/{filename}
 *
 * Store the object key (path within bucket) in the DB as `*_image_path` columns;
 * when displaying, use getSignedUrlForPath or createSignedUrl (private buckets).
 */

import { supabase } from '@/lib/supabase'

/** Storage bucket ids (must match migration). */
export const BUCKETS = {
  portfolio: 'portfolio',
  clientUploads: 'client-uploads',
  avatars: 'avatars',
} as const

export type TrustfallBucket = (typeof BUCKETS)[keyof typeof BUCKETS]

/** Join segments into a storage object key (no leading slash). */
export function storageKey(...segments: string[]): string {
  return segments.join('/').replace(/^\/+/, '')
}

/** Portfolio: pro-owned object key; must match DB `before_image_path` / `after_image_path`. */
export function portfolioObjectPath(
  professionalId: string,
  portfolioItemId: string,
  filename: string,
): string {
  return storageKey(professionalId, portfolioItemId, filename)
}

/** Example filenames for portfolio items. */
export const PORTFOLIO_FILENAMES = {
  before: 'before.jpg',
  after: 'after.jpg',
} as const

/** Match wizard / client private uploads: user must equal auth.uid(). */
export function clientMatchRequestPath(
  userId: string,
  matchRequestId: string,
  kind: 'inspiration' | 'current',
  ext: 'jpg' | 'jpeg' | 'png' | 'webp' = 'jpg',
): string {
  const base = kind === 'inspiration' ? 'inspiration' : 'current'
  return storageKey(userId, 'match-requests', matchRequestId, `${base}.${ext}`)
}

/** Optional: contact request–scoped uploads (same private bucket). */
export function clientContactRequestPath(
  userId: string,
  contactRequestId: string,
  kind: 'inspiration' | 'current',
  ext: 'jpg' | 'jpeg' | 'png' | 'webp' = 'jpg',
): string {
  const base = kind === 'inspiration' ? 'inspiration' : 'current'
  return storageKey(userId, 'contact-requests', contactRequestId, `${base}.${ext}`)
}

/** Profile avatar object key. */
export function avatarPath(userId: string, filename = 'avatar.jpg'): string {
  return storageKey(userId, filename)
}

export type UploadBody = Blob | ArrayBuffer | File

export type UploadOptions = {
  contentType?: string
  upsert?: boolean
  cacheControl?: string
}

/**
 * Upload arbitrary bytes to a bucket path. Caller must use paths that satisfy RLS
 * (e.g. first segment = auth.uid() for client-uploads and avatars).
 */
export async function uploadToBucket(
  bucket: TrustfallBucket,
  path: string,
  body: UploadBody,
  options: UploadOptions = {},
) {
  return supabase.storage.from(bucket).upload(path, body, {
    upsert: options.upsert ?? true,
    contentType: options.contentType,
    cacheControl: options.cacheControl ?? '3600',
  })
}

/**
 * React Native / Expo: upload a local file URI (e.g. ImagePicker result).
 * Reads the file via fetch → Blob so the Supabase client receives a web-compatible body.
 */
export async function uploadFromLocalUri(
  bucket: TrustfallBucket,
  path: string,
  localUri: string,
  options: UploadOptions = {},
) {
  const response = await fetch(localUri)
  const blob = await response.blob()
  const contentType = options.contentType ?? (blob.type || 'image/jpeg')
  return uploadToBucket(bucket, path, blob, { ...options, contentType })
}

/** Portfolio image upload; only succeeds if professionals.owner_user_id = auth.uid() for professionalId. */
export async function uploadPortfolioImage(
  professionalId: string,
  portfolioItemId: string,
  filename: string,
  body: UploadBody,
  options: UploadOptions = {},
) {
  const path = portfolioObjectPath(professionalId, portfolioItemId, filename)
  return uploadToBucket(BUCKETS.portfolio, path, body, options)
}

/** Client-only paths: pass userId from auth.session.user.id (must match JWT). */
export async function uploadClientMatchPhoto(
  userId: string,
  matchRequestId: string,
  kind: 'inspiration' | 'current',
  source: Blob | ArrayBuffer | { uri: string },
  options: UploadOptions & { ext?: 'jpg' | 'jpeg' | 'png' | 'webp' } = {},
) {
  const path = clientMatchRequestPath(userId, matchRequestId, kind, options.ext ?? 'jpg')
  if ('uri' in source && typeof source.uri === 'string') {
    return uploadFromLocalUri(BUCKETS.clientUploads, path, source.uri, options)
  }
  return uploadToBucket(BUCKETS.clientUploads, path, source as Blob | ArrayBuffer, options)
}

/** Contact-request uploads — same bucket/RLS as match wizard (`client-uploads/{user_id}/...`). */
export async function uploadClientContactPhoto(
  userId: string,
  contactRequestId: string,
  kind: 'inspiration' | 'current',
  localUri: string,
  options: UploadOptions & { ext?: 'jpg' | 'jpeg' | 'png' | 'webp' } = {},
) {
  const path = clientContactRequestPath(userId, contactRequestId, kind, options.ext ?? 'jpg')
  return uploadFromLocalUri(BUCKETS.clientUploads, path, localUri, options)
}

/**
 * Staging folder when there is no `contact_requests` row (catalog not resolvable) or DB insert failed.
 * Still under `client-uploads/{user_id}/…` so RLS applies. Notify server signs the returned path.
 * Path: `{userId}/booking-notify/{stagingId}/inspiration|current.{ext}`
 */
export function clientBookingNotifyStagingPath(
  userId: string,
  stagingId: string,
  kind: 'inspiration' | 'current',
  ext: 'jpg' | 'jpeg' | 'png' | 'webp' = 'jpg',
): string {
  const base = kind === 'inspiration' ? 'inspiration' : 'current'
  return storageKey(userId, 'booking-notify', stagingId, `${base}.${ext}`)
}

export async function uploadClientBookingNotifyStagingPhoto(
  userId: string,
  stagingId: string,
  kind: 'inspiration' | 'current',
  localUri: string,
  options: UploadOptions & { ext?: 'jpg' | 'jpeg' | 'png' | 'webp' } = {},
) {
  const path = clientBookingNotifyStagingPath(userId, stagingId, kind, options.ext ?? 'jpg')
  return uploadFromLocalUri(BUCKETS.clientUploads, path, localUri, options)
}

export async function uploadAvatar(
  userId: string,
  source: Blob | ArrayBuffer | { uri: string },
  options: UploadOptions & { filename?: string } = {},
) {
  const path = avatarPath(userId, options.filename ?? 'avatar.jpg')
  if ('uri' in source && typeof source.uri === 'string') {
    return uploadFromLocalUri(BUCKETS.avatars, path, source.uri, options)
  }
  return uploadToBucket(BUCKETS.avatars, path, source as Blob | ArrayBuffer, options)
}

/** Private buckets: signed URL for display (default 1 hour). */
export async function createSignedUrlForPath(
  bucket: TrustfallBucket,
  path: string,
  expiresInSeconds = 3600,
) {
  return supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds)
}

/** Public read for published portfolio objects still uses a signed URL on private buckets; use this for any client display. */
export async function getSignedUrlForPath(
  bucket: TrustfallBucket,
  path: string,
  expiresInSeconds = 3600,
) {
  const { data, error } = await createSignedUrlForPath(bucket, path, expiresInSeconds)
  if (error) return { url: null as string | null, error }
  return { url: data.signedUrl, error: null }
}

/** Remove an object (RLS must allow delete). */
export async function removeObject(bucket: TrustfallBucket, path: string) {
  return supabase.storage.from(bucket).remove([path])
}
