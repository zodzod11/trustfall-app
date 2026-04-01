/**
 * Portfolio-first service: items, tags, Explore catalog, pro dashboard.
 * Relies on RLS; mutations only succeed when professionals.owner_user_id = auth.uid().
 */

import { supabase } from '@/lib/supabase'
import type { PortfolioItemInsert, PortfolioItemRow, PortfolioItemUpdate, ProfessionalRow } from '@/types/database'
import type {
  CreatePortfolioItemInput,
  ExploreCatalogQuery,
  ExplorePortfolioItem,
  PortfolioItemExploreRow,
  ProDashboardBundle,
  ProDashboardInboxSummary,
  ProDashboardSnapshot,
  UpdatePortfolioItemInput,
} from '@/domain/pro'
import { authPostgrestError, fail, ok, type ProServiceResult } from './result'

function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))]
}

function toPortfolioInsert(input: CreatePortfolioItemInput): PortfolioItemInsert {
  return {
    professional_id: input.professional_id,
    service_title: input.service_title,
    category: input.category,
    price: input.price ?? null,
    before_image_path: input.before_image_path ?? null,
    after_image_path: input.after_image_path ?? null,
    sort_order: input.sort_order ?? 0,
    published: input.published ?? false,
  }
}

function toPortfolioUpdate(patch: UpdatePortfolioItemInput): PortfolioItemUpdate {
  const u: PortfolioItemUpdate = {}
  if (patch.service_title !== undefined) u.service_title = patch.service_title
  if (patch.category !== undefined) u.category = patch.category
  if (patch.price !== undefined) u.price = patch.price
  if (patch.before_image_path !== undefined) u.before_image_path = patch.before_image_path
  if (patch.after_image_path !== undefined) u.after_image_path = patch.after_image_path
  if (patch.sort_order !== undefined) u.sort_order = patch.sort_order
  if (patch.published !== undefined) u.published = patch.published
  return u
}

/** Create a portfolio item; optional tags applied after insert. */
export async function createPortfolioItem(
  input: CreatePortfolioItemInput,
): Promise<ProServiceResult<PortfolioItemRow>> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr) return fail(authPostgrestError(userErr.message))
  if (!userData.user) return fail(authPostgrestError('Not authenticated'))

  const { data, error } = await supabase
    .from('portfolio_items')
    .insert(toPortfolioInsert(input))
    .select()
    .single()

  if (error) return fail(error)
  const row = data as PortfolioItemRow

  if (input.tags && input.tags.length > 0) {
    const tagResult = await replacePortfolioItemTags(row.id, input.tags)
    if (tagResult.error) return fail(tagResult.error)
  }

  return ok(row)
}

export async function updatePortfolioItem(
  portfolioItemId: string,
  patch: UpdatePortfolioItemInput,
): Promise<ProServiceResult<PortfolioItemRow>> {
  const update = toPortfolioUpdate(patch)
  if (Object.keys(update).length === 0) {
    const { data, error } = await supabase.from('portfolio_items').select('*').eq('id', portfolioItemId).single()
    if (error) return fail(error)
    return ok(data as PortfolioItemRow)
  }
  const { data, error } = await supabase
    .from('portfolio_items')
    .update(update)
    .eq('id', portfolioItemId)
    .select()
    .single()
  if (error) return fail(error)
  return ok(data as PortfolioItemRow)
}

export async function setPortfolioItemPublished(
  portfolioItemId: string,
  published: boolean,
): Promise<ProServiceResult<PortfolioItemRow>> {
  return updatePortfolioItem(portfolioItemId, { published })
}

/**
 * Replace all style tags for an item (idempotent). Empty array removes all tags.
 */
export async function replacePortfolioItemTags(
  portfolioItemId: string,
  tags: string[],
): Promise<ProServiceResult<{ count: number }>> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr) return fail(authPostgrestError(userErr.message))
  if (!userData.user) return fail(authPostgrestError('Not authenticated'))

  const normalized = normalizeTags(tags)

  const { error: delErr } = await supabase.from('portfolio_item_tags').delete().eq('portfolio_item_id', portfolioItemId)
  if (delErr) return fail(delErr)

  if (normalized.length === 0) {
    return ok({ count: 0 })
  }

  const rows = normalized.map((tag) => ({ portfolio_item_id: portfolioItemId, tag }))
  const { error: insErr } = await supabase.from('portfolio_item_tags').insert(rows)
  if (insErr) return fail(insErr)
  return ok({ count: normalized.length })
}

/**
 * Published-only catalog for Explore (portfolio-first). RLS enforces published pro + item.
 */
export async function fetchPublishedPortfolioForExplore(
  query: ExploreCatalogQuery = {},
): Promise<ProServiceResult<ExplorePortfolioItem[]>> {
  const limit = query.limit ?? 48
  const offset = query.offset ?? 0

  let q = supabase
    .from('portfolio_items')
    .select(
      `
      *,
      professionals!inner (
        id,
        slug,
        display_name,
        title,
        city,
        category,
        rating,
        review_count,
        published
      ),
      portfolio_item_tags (
        tag
      )
    `,
    )
    .eq('published', true)
    .order('sort_order', { ascending: true })
    .range(offset, offset + limit - 1)

  if (query.category) {
    q = q.eq('category', query.category)
  }

  const { data, error } = await q
  if (error) return fail(error)

  const rows = (data ?? []) as PortfolioItemExploreRow[]
  const mapped: ExplorePortfolioItem[] = rows.map((row) => {
    const { professionals: pro, portfolio_item_tags: tagRows, ...portfolio } = row
    const tags = (tagRows ?? []).map((r) => r.tag)
    return {
      portfolio: portfolio as PortfolioItemRow,
      professional: pro,
      tags,
    }
  })

  return ok(mapped)
}

/** Dashboard: owned professional + all items (drafts included) with tags + optional inbox counts. */
export async function fetchProDashboardForCurrentUser(options?: {
  includeInboxSummary?: boolean
}): Promise<ProServiceResult<ProDashboardBundle>> {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr) return fail(authPostgrestError(userErr.message))
  if (!userData.user) return fail(authPostgrestError('Not authenticated'))

  const { data: pro, error: proErr } = await supabase
    .from('professionals')
    .select('*')
    .eq('owner_user_id', userData.user.id)
    .maybeSingle()

  if (proErr) return fail(proErr)
  if (!pro) {
    const empty: ProDashboardBundle = {
      dashboard: { professional: null, items: [] },
    }
    return ok(empty)
  }

  const professional = pro as ProfessionalRow

  const { data: items, error: itemsErr } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('professional_id', professional.id)
    .order('sort_order', { ascending: true })

  if (itemsErr) return fail(itemsErr)

  const itemRows = (items ?? []) as PortfolioItemRow[]
  const ids = itemRows.map((i) => i.id)
  let tagsByItem = new Map<string, string[]>()

  if (ids.length > 0) {
    const { data: tagData, error: tagErr } = await supabase
      .from('portfolio_item_tags')
      .select('portfolio_item_id, tag')
      .in('portfolio_item_id', ids)
    if (tagErr) return fail(tagErr)
    for (const row of tagData ?? []) {
      const pid = row.portfolio_item_id
      const list = tagsByItem.get(pid) ?? []
      list.push(row.tag)
      tagsByItem.set(pid, list)
    }
  }

  const snapshot: ProDashboardSnapshot = {
    professional,
    items: itemRows.map((it) => ({
      ...it,
      tags: tagsByItem.get(it.id) ?? [],
    })),
  }

  const bundle: ProDashboardBundle = { dashboard: snapshot }

  if (options?.includeInboxSummary) {
    const { count, error: cErr } = await supabase
      .from('contact_requests')
      .select('id', { count: 'exact', head: true })
      .eq('professional_id', professional.id)
      .eq('status', 'pending')

    if (cErr) return fail(cErr)
    const inbox: ProDashboardInboxSummary = {
      pending_contact_requests: count ?? 0,
    }
    bundle.inbox = inbox
  }

  return ok(bundle)
}
