import { createClient } from '../client'
import { ensureAuthSession } from './ensureSession'
import { insertSubmittedMatchRequest } from './insertMatchRequest'
import {
  persistMatchRequestImagePaths,
  uploadMatchRequestImages,
} from './uploadMatchRequestImages'
import { triggerMatchEngine } from './triggerMatchEngine'
import type { MatchRequestDraft } from '../../types'

export type SubmitMatchFlowResult =
  | { ok: true; matchRequestId: string }
  | { ok: false; error: string }

/**
 * Persists a submitted match request, uploads optional images, then triggers the rules engine.
 */
export async function submitMatchRequestFlow(
  draft: MatchRequestDraft,
  files: { inspiration: File | null; current: File | null },
): Promise<SubmitMatchFlowResult> {
  const auth = await ensureAuthSession()
  if (auth.needsEmailAuthFallback) {
    return {
      ok: false,
      error: 'Create an account or sign in to continue (guest sign-in is off for this project).',
    }
  }
  if (!auth.userId || auth.error) {
    return { ok: false, error: auth.error ?? 'Not authenticated' }
  }
  const userId = auth.userId

  const supabase = createClient()

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

  const triggered = await triggerMatchEngine(matchRequestId)
  if (!triggered.ok) {
    return {
      ok: false,
      error:
        triggered.error ??
        'Match request saved but the matcher could not be started. Try again from your profile later.',
    }
  }

  return { ok: true, matchRequestId }
}
