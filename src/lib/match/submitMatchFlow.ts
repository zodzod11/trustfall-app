import { createClient } from '../client'
import { ensureAuthSession } from './ensureSession'
import { triggerMatchEngine } from './triggerMatchEngine'
import { submitMatchRequestFlowWithClient, type SubmitMatchFlowResult } from './submitMatchFlowShared'
import type { MatchRequestDraft } from '../../types'

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
  return submitMatchRequestFlowWithClient({
    supabase,
    userId,
    draft,
    files,
    trigger: triggerMatchEngine,
  })
}
