import type { SupabaseClient } from '@supabase/supabase-js'

// Accept UUID-shaped deterministic seed IDs even if they don't use RFC version/variant bits.
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type SavedSnapshot = {
  userId: string | null
  savedPortfolioItemIds: string[]
  savedProfessionalIds: string[]
}

type SavedResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export function isCanonicalSavedEntityId(value: string): boolean {
  return UUID_PATTERN.test(value.trim())
}

function isMissingTableError(message: string, tableName: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes(`public.${tableName}`.toLowerCase()) &&
    (lower.includes('could not find the table') ||
      lower.includes('does not exist') ||
      lower.includes('schema cache'))
  )
}

async function getCurrentUserId(supabase: SupabaseClient): Promise<SavedResult<string | null>> {
  const { data, error } = await supabase.auth.getUser()
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: data.user?.id ?? null }
}

function ensureCanonicalId(kind: 'portfolio item' | 'professional', value: string): SavedResult<string> {
  const trimmed = value.trim()
  if (!isCanonicalSavedEntityId(trimmed)) {
    return {
      ok: false,
      error: `Only live catalog ${kind} IDs can be saved in this build.`,
    }
  }
  return { ok: true, data: trimmed }
}

export async function fetchSavedSnapshot(
  supabase: SupabaseClient,
): Promise<SavedResult<SavedSnapshot>> {
  const currentUser = await getCurrentUserId(supabase)
  if (!currentUser.ok) return currentUser
  if (!currentUser.data) {
    return {
      ok: true,
      data: {
        userId: null,
        savedPortfolioItemIds: [],
        savedProfessionalIds: [],
      },
    }
  }

  const userId = currentUser.data
  const [portfolioRows, professionalRows] = await Promise.all([
    supabase
      .from('saved_portfolios')
      .select('portfolio_item_id')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false }),
    supabase
      .from('saved_professionals')
      .select('professional_id')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false }),
  ])

  if (portfolioRows.error) return { ok: false, error: portfolioRows.error.message }
  if (professionalRows.error && !isMissingTableError(professionalRows.error.message, 'saved_professionals')) {
    return { ok: false, error: professionalRows.error.message }
  }

  return {
    ok: true,
    data: {
      userId,
      savedPortfolioItemIds: (portfolioRows.data ?? [])
        .map((row) => row.portfolio_item_id)
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
      savedProfessionalIds: ((professionalRows.data as { professional_id?: string }[] | null) ?? [])
        .map((row) => row.professional_id)
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    },
  }
}

export async function savePortfolioItem(
  supabase: SupabaseClient,
  portfolioItemId: string,
): Promise<SavedResult<void>> {
  const canonicalId = ensureCanonicalId('portfolio item', portfolioItemId)
  if (!canonicalId.ok) return canonicalId

  const currentUser = await getCurrentUserId(supabase)
  if (!currentUser.ok) return currentUser
  if (!currentUser.data) return { ok: false, error: 'Sign in to save looks.' }

  const { error } = await supabase.from('saved_portfolios').upsert(
    {
      user_id: currentUser.data,
      portfolio_item_id: canonicalId.data,
    },
    { onConflict: 'user_id,portfolio_item_id' },
  )

  if (error && !isMissingTableError(error.message, 'saved_professionals')) {
    return { ok: false, error: error.message }
  }
  return { ok: true, data: undefined }
}

export async function removeSavedPortfolioItem(
  supabase: SupabaseClient,
  portfolioItemId: string,
): Promise<SavedResult<void>> {
  const canonicalId = ensureCanonicalId('portfolio item', portfolioItemId)
  if (!canonicalId.ok) return canonicalId

  const currentUser = await getCurrentUserId(supabase)
  if (!currentUser.ok) return currentUser
  if (!currentUser.data) return { ok: false, error: 'Sign in to manage saved looks.' }

  const { error } = await supabase
    .from('saved_portfolios')
    .delete()
    .eq('user_id', currentUser.data)
    .eq('portfolio_item_id', canonicalId.data)

  if (error && !isMissingTableError(error.message, 'saved_professionals')) {
    return { ok: false, error: error.message }
  }
  return { ok: true, data: undefined }
}

export async function saveProfessional(
  supabase: SupabaseClient,
  professionalId: string,
): Promise<SavedResult<void>> {
  const canonicalId = ensureCanonicalId('professional', professionalId)
  if (!canonicalId.ok) return canonicalId

  const currentUser = await getCurrentUserId(supabase)
  if (!currentUser.ok) return currentUser
  if (!currentUser.data) return { ok: false, error: 'Sign in to save providers.' }

  const { error } = await supabase.from('saved_professionals').upsert(
    {
      user_id: currentUser.data,
      professional_id: canonicalId.data,
    },
    { onConflict: 'user_id,professional_id' },
  )

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: undefined }
}

export async function removeSavedProfessional(
  supabase: SupabaseClient,
  professionalId: string,
): Promise<SavedResult<void>> {
  const canonicalId = ensureCanonicalId('professional', professionalId)
  if (!canonicalId.ok) return canonicalId

  const currentUser = await getCurrentUserId(supabase)
  if (!currentUser.ok) return currentUser
  if (!currentUser.data) return { ok: false, error: 'Sign in to manage saved providers.' }

  const { error } = await supabase
    .from('saved_professionals')
    .delete()
    .eq('user_id', currentUser.data)
    .eq('professional_id', canonicalId.data)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: undefined }
}
