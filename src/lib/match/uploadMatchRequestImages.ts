import type { SupabaseClient } from '@supabase/supabase-js'
import type { MatchImagePaths, MatchImageSource } from './types'

const BUCKET = 'client-uploads'

function isUriImageSource(
  source: MatchImageSource,
): source is { uri: string; filename?: string; contentType?: string } {
  return typeof source === 'object' && source !== null && 'uri' in source
}

function isByteArrayImageSource(
  source: MatchImageSource,
): source is { bytes: ArrayBuffer; filename?: string; contentType?: string } {
  return typeof source === 'object' && source !== null && 'bytes' in source
}

function extFromName(name: string): string {
  const n = name.toLowerCase()
  if (n.endsWith('.png')) return 'png'
  if (n.endsWith('.webp')) return 'webp'
  if (n.endsWith('.heic')) return 'heic'
  if (n.endsWith('.heif')) return 'heif'
  if (n.endsWith('.jpeg')) return 'jpeg'
  return 'jpg'
}

function getSourceMeta(source: MatchImageSource): { filename: string; contentType: string; ext: string } {
  if (typeof File !== 'undefined' && source instanceof File) {
    const filename = source.name || 'image.jpg'
    return {
      filename,
      contentType: source.type || 'image/jpeg',
      ext: extFromName(filename),
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

async function toUploadBody(source: MatchImageSource): Promise<Blob | File | ArrayBuffer> {
  if (typeof File !== 'undefined' && source instanceof File) return source
  if (isByteArrayImageSource(source)) return source.bytes
  const response = await fetch(source.uri)
  return response.blob()
}

/**
 * Uploads optional inspiration / current-look files to private `client-uploads` and returns
 * Storage object keys for `match_requests` columns.
 */
export async function uploadMatchRequestImages(
  supabase: SupabaseClient,
  userId: string,
  matchRequestId: string,
  inspiration: MatchImageSource | null,
  current: MatchImageSource | null,
): Promise<{ paths: MatchImagePaths; error: string | null }> {
  const paths: MatchImagePaths = {
    inspiration_image_path: null,
    current_photo_path: null,
  }

  const base = `${userId}/match-requests/${matchRequestId}`

  if (inspiration) {
    const meta = getSourceMeta(inspiration)
    const key = `${base}/inspiration.${meta.ext}`
    const body = await toUploadBody(inspiration)
    const { error } = await supabase.storage.from(BUCKET).upload(key, body, {
      upsert: true,
      contentType: meta.contentType,
    })
    if (error) {
      return { paths, error: error.message }
    }
    paths.inspiration_image_path = key
  }

  if (current) {
    const meta = getSourceMeta(current)
    const key = `${base}/current.${meta.ext}`
    const body = await toUploadBody(current)
    const { error } = await supabase.storage.from(BUCKET).upload(key, body, {
      upsert: true,
      contentType: meta.contentType,
    })
    if (error) {
      return { paths, error: error.message }
    }
    paths.current_photo_path = key
  }

  return { paths, error: null }
}

export async function persistMatchRequestImagePaths(
  supabase: SupabaseClient,
  matchRequestId: string,
  paths: MatchImagePaths,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('match_requests')
    .update({
      inspiration_image_path: paths.inspiration_image_path,
      current_photo_path: paths.current_photo_path,
    })
    .eq('id', matchRequestId)

  return { error: error?.message ?? null }
}
