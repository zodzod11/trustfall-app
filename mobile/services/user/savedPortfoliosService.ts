/**
 * `saved_portfolios` — favorites for the signed-in user (portfolio-first listing).
 */

import { supabase } from '@/lib/supabase'
import type { PortfolioItemRow, SavedPortfolioRow } from '@/types/database'
import { authPostgrestError, fail, ok, type UserServiceResult } from './result'

/** Saved row with embedded portfolio item for feed cards. */
export type SavedPortfolioWithItem = SavedPortfolioRow & {
  portfolio_items: PortfolioItemRow | null
}

export async function listMySavedPortfolios(): Promise<UserServiceResult<SavedPortfolioWithItem[]>> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr) return fail(authPostgrestError(userErr.message))
  if (!userData.user) return fail(authPostgrestError('Not authenticated'))

  const { data, error } = await supabase
    .from('saved_portfolios')
    .select(
      `
      user_id,
      portfolio_item_id,
      saved_at,
      portfolio_items (
        id,
        professional_id,
        service_title,
        category,
        price,
        before_image_path,
        after_image_path,
        sort_order,
        published,
        created_at,
        updated_at
      )
    `,
    )
    .eq('user_id', userData.user.id)
    .order('saved_at', { ascending: false })

  if (error) return fail(error)

  const rows = (data ?? []) as {
    user_id: string
    portfolio_item_id: string
    saved_at: string
    portfolio_items: PortfolioItemRow | PortfolioItemRow[] | null
  }[]

  const mapped: SavedPortfolioWithItem[] = rows.map((r) => {
    const pi = r.portfolio_items
    const item = Array.isArray(pi) ? pi[0] ?? null : pi
    return {
      user_id: r.user_id,
      portfolio_item_id: r.portfolio_item_id,
      saved_at: r.saved_at,
      portfolio_items: item,
    }
  })

  return ok(mapped)
}

export async function savePortfolioItem(portfolioItemId: string): Promise<UserServiceResult<SavedPortfolioRow>> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr) return fail(authPostgrestError(userErr.message))
  if (!userData.user) return fail(authPostgrestError('Not authenticated'))

  const { data, error } = await supabase
    .from('saved_portfolios')
    .upsert(
      {
        user_id: userData.user.id,
        portfolio_item_id: portfolioItemId,
      },
      { onConflict: 'user_id,portfolio_item_id' },
    )
    .select()
    .single()

  if (error) return fail(error)
  return ok(data as SavedPortfolioRow)
}

export async function removeSavedPortfolioItem(portfolioItemId: string): Promise<UserServiceResult<void>> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr) return fail(authPostgrestError(userErr.message))
  if (!userData.user) return fail(authPostgrestError('Not authenticated'))

  const { error } = await supabase
    .from('saved_portfolios')
    .delete()
    .eq('user_id', userData.user.id)
    .eq('portfolio_item_id', portfolioItemId)

  if (error) return fail(error)
  return ok(undefined)
}
