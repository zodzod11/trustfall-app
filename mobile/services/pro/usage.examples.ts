/**
 * Example usage — not executed; safe to import in docs or delete after onboarding.
 *
 * ```ts
 * import {
 *   createMyProfessional,
 *   createPortfolioItem,
 *   fetchProDashboardForCurrentUser,
 *   fetchPublishedPortfolioForExplore,
 *   replacePortfolioItemTags,
 *   setPortfolioItemPublished,
 *   updateMyProfessional,
 *   updatePortfolioItem,
 * } from '@/services/pro'
 * ```
 */

import {
  createMyProfessional,
  createPortfolioItem,
  fetchProDashboardForCurrentUser,
  fetchPublishedPortfolioForExplore,
  replacePortfolioItemTags,
  setPortfolioItemPublished,
  updateMyProfessional,
  updatePortfolioItem,
} from './index'

/** Example: onboarding a new pro + first look. */
export async function exampleOnboardProAndFirstLook() {
  const pro = await createMyProfessional({
    slug: 'jane-doe-hair',
    display_name: 'Jane Doe',
    title: 'Stylist',
    category: 'hair',
    city: 'Houston',
    published: true,
  })
  if (pro.error) return { ok: false as const, error: pro.error }

  const item = await createPortfolioItem({
    professional_id: pro.data.id,
    service_title: 'Silk press',
    category: 'hair',
    price: '120',
    published: true,
    tags: ['silk press', 'natural hair'],
  })
  if (item.error) return { ok: false as const, error: item.error }

  return { ok: true as const, professionalId: pro.data.id, portfolioItemId: item.data.id }
}

/** Example: Explore feed (client). */
export async function exampleExploreFeed() {
  const res = await fetchPublishedPortfolioForExplore({ category: 'hair', limit: 24, offset: 0 })
  if (res.error) return { ok: false as const, error: res.error }
  for (const card of res.data) {
    void card.portfolio.service_title
    void card.professional.display_name
    void card.tags
  }
  return { ok: true as const, count: res.data.length }
}

/** Example: pro dashboard + publish toggle. */
export async function exampleDashboardAndPublish() {
  const dash = await fetchProDashboardForCurrentUser({ includeInboxSummary: true })
  if (dash.error) return { ok: false as const, error: dash.error }

  const first = dash.data.dashboard.items[0]
  if (!first) return { ok: true as const, message: 'no items' }

  const pub = await setPortfolioItemPublished(first.id, true)
  if (pub.error) return { ok: false as const, error: pub.error }

  const tags = await replacePortfolioItemTags(first.id, ['updated-tag', 'editorial'])
  if (tags.error) return { ok: false as const, error: tags.error }

  return { ok: true as const }
}

/** Example: patch profile + portfolio metadata. */
export async function examplePatchProAndItem(professionalId: string, portfolioItemId: string) {
  const p = await updateMyProfessional(professionalId, { display_name: 'Jane D.', city: 'Austin' })
  if (p.error) return p

  const i = await updatePortfolioItem(portfolioItemId, { service_title: 'Updated title', sort_order: 1 })
  return i
}
