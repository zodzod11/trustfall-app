import type { SupabaseClient } from '@supabase/supabase-js'
import { insertSubmittedMatchRequest } from './insertMatchRequest'
import {
  persistMatchRequestImagePaths,
  uploadMatchRequestImages,
} from './uploadMatchRequestImages'
import type { MatchRequestDraft } from '../../types'
import type { MatchImageSource } from './types'

export type SubmitMatchFlowResult =
  | { ok: true; matchRequestId: string }
  | { ok: false; error: string }

type SubmitMatchFlowInputs = {
  supabase: SupabaseClient
  userId: string
  draft: MatchRequestDraft
  files: { inspiration: MatchImageSource | null; current: MatchImageSource | null }
  trigger: (matchRequestId: string) => Promise<{ ok: boolean; error: string | null }>
}

export async function submitMatchRequestFlowWithClient({
  supabase,
  userId,
  draft,
  files,
  trigger,
}: SubmitMatchFlowInputs): Promise<SubmitMatchFlowResult> {
  try {
    const inserted = await insertSubmittedMatchRequest(supabase, draft, userId)
    if (inserted.error || !inserted.id) {
      return { ok: false, error: inserted.error ?? 'Failed to save match request' }
    }

    const matchRequestId = inserted.id

    if (files.inspiration || files.current) {
      const { paths, error: upErr } = await uploadMatchRequestImages(
        supabase,
        userId,
        matchRequestId,
        files.inspiration,
        files.current,
      )
      if (upErr) {
        return { ok: false, error: upErr }
      }
      if (paths.inspiration_image_path || paths.current_photo_path) {
        const { error: patchErr } = await persistMatchRequestImagePaths(
          supabase,
          matchRequestId,
          paths,
        )
        if (patchErr) {
          return { ok: false, error: patchErr }
        }
      }
    }

    const triggered = await trigger(matchRequestId)
    if (!triggered.ok) {
      return {
        ok: false,
        error:
          triggered.error ??
          'Match request saved but the matcher could not be started. Try again from your profile later.',
      }
    }

    return { ok: true, matchRequestId }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unexpected match submission failure',
    }
  }
}
