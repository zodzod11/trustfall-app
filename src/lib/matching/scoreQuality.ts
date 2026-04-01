import { clamp, parseMoney, roundScore } from './numbers'
import type { CatalogPortfolioRow, ComponentScore } from './types'
import { MATCH_WEIGHTS } from './weights'

/**
 * Portfolio / pro quality: rating, reviews, experience (rules-only, no embeddings).
 */
export function scoreQuality(row: CatalogPortfolioRow): ComponentScore {
  const max = MATCH_WEIGHTS.quality
  const r = parseMoney(row.professionals.rating)
  const ratingPart = r === null ? 0.55 : clamp((r - 3) / 2.2, 0, 1)
  const reviews = row.professionals.review_count ?? 0
  const reviewPart = Math.min(1, Math.log10(reviews + 1) / 2.2)
  const years = row.professionals.years_experience ?? 0
  const expPart = Math.min(1, years / 12)

  const blended = ratingPart * 0.55 + reviewPart * 0.28 + expPart * 0.17
  return {
    key: 'quality',
    points: roundScore(max * blended),
    max,
    label:
      blended >= 0.72
        ? 'standout portfolio & reputation'
        : blended >= 0.45
          ? 'solid professional signals'
          : 'emerging portfolio',
  }
}
