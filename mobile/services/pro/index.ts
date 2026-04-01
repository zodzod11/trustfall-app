/**
 * Pro-side backend services (Supabase). Portfolio-first; see `usage.examples.ts` for calls.
 */

export type { ProServiceResult } from './result'
export { authPostgrestError, fail, ok } from './result'

export {
  createMyProfessional,
  getMyProfessional,
  updateMyProfessional,
} from './professionalService'

export {
  createPortfolioItem,
  fetchProDashboardForCurrentUser,
  fetchPublishedPortfolioForExplore,
  replacePortfolioItemTags,
  setPortfolioItemPublished,
  updatePortfolioItem,
} from './portfolioService'
