import type { SupabaseClient } from '@supabase/supabase-js'
import type { MatchRequestDraft } from '../../types'

export type InsertMatchRequestResult = {
  id: string | null
  error: string | null
}

/** Maps wizard draft into `match_requests` insert (submitted). */
export function draftToMatchRequestInsert(
  draft: MatchRequestDraft,
  userId: string,
): Record<string, unknown> {
  const category = draft.category.trim()
  const vision = draft.notes.trim()
  const desired = (draft.desiredStyleText ?? '').trim() || vision || null
  const currentState = (draft.currentStateText ?? '').trim() || null

  return {
    user_id: userId,
    status: 'submitted',
    category: category.length > 0 ? category : null,
    location_text: draft.location.trim() || null,
    tags: draft.tags.map((t) => t.trim()).filter(Boolean),
    vision_notes: vision.length > 0 ? vision : null,
    desired_style_text: desired,
    current_state_text: currentState,
    budget_min:
      draft.budgetMin != null && String(draft.budgetMin).trim() !== ''
        ? String(draft.budgetMin).trim()
        : null,
    budget_max:
      draft.budgetMax != null && String(draft.budgetMax).trim() !== ''
        ? String(draft.budgetMax).trim()
        : null,
    inspiration_image_path: null as string | null,
    current_photo_path: null as string | null,
    saved_look_portfolio_item_id: draft.savedLookPortfolioItemId?.trim() || null,
    submitted_at: new Date().toISOString(),
  }
}

export async function insertSubmittedMatchRequest(
  supabase: SupabaseClient,
  draft: MatchRequestDraft,
  userId: string,
): Promise<InsertMatchRequestResult> {
  const row = draftToMatchRequestInsert(draft, userId)
  const { data, error } = await supabase.from('match_requests').insert(row).select('id').single()

  if (error) {
    return { id: null, error: error.message }
  }
  return { id: (data as { id: string }).id, error: null }
}
