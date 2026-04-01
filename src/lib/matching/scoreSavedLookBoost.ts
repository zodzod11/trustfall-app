import type { ComponentScore } from './types'
import { MATCH_WEIGHTS } from './weights'

export function scoreSavedLookBoost(
  savedLookPortfolioItemId: string | null | undefined,
  portfolioItemId: string,
): ComponentScore {
  const max = MATCH_WEIGHTS.savedLookBoost
  if (savedLookPortfolioItemId && savedLookPortfolioItemId === portfolioItemId) {
    return {
      key: 'saved_look',
      points: max,
      max,
      label: 'your saved look',
    }
  }
  return { key: 'saved_look', points: 0, max, label: undefined }
}
