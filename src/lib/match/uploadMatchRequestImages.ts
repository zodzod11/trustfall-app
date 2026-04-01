import type { SupabaseClient } from '@supabase/supabase-js'
import type { MatchImagePaths } from './types'

const BUCKET = 'client-uploads'

function extFromFile(file: File): string {
  const n = file.name.toLowerCase()
  if (n.endsWith('.png')) return 'png'
  if (n.endsWith('.webp')) return 'webp'
  if (n.endsWith('.heic')) return 'heic'
  if (n.endsWith('.heif')) return 'heif'
  return 'jpg'
}

/**
 * Uploads optional inspiration / current-look files to private `client-uploads` and returns
 * Storage object keys for `match_requests` columns.
 */
export async function uploadMatchRequestImages(
  supabase: SupabaseClient,
  userId: string,
  matchRequestId: string,
  inspiration: File | null,
  current: File | null,
): Promise<{ paths: MatchImagePaths; error: string | null }> {
  const paths: MatchImagePaths = {
    inspiration_image_path: null,
    current_photo_path: null,
  }

  const base = `${userId}/match-requests/${matchRequestId}`

  if (inspiration) {
    const key = `${base}/inspiration.${extFromFile(inspiration)}`
    const { error } = await supabase.storage.from(BUCKET).upload(key, inspiration, {
      upsert: true,
      contentType: inspiration.type || 'image/jpeg',
    })
    if (error) {
      return { paths, error: error.message }
    }
    paths.inspiration_image_path = key
  }

  if (current) {
    const key = `${base}/current.${extFromFile(current)}`
    const { error } = await supabase.storage.from(BUCKET).upload(key, current, {
      upsert: true,
      contentType: current.type || 'image/jpeg',
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
