import type { CatalogPortfolioRow, ComponentScore, MatchRequestRecord, ScoredPortfolioItem } from './types'
import { clamp, roundScore } from './numbers'
import { buildCuratedReasons } from './reasons'
import { scoreBudget } from './scoreBudget'
import { scoreCurrentLook } from './scoreCurrentLook'
import { scoreDesiredStyle } from './scoreDesiredStyle'
import { scoreLocation } from './scoreLocation'
import { scoreQuality } from './scoreQuality'
import { scoreSavedLookBoost } from './scoreSavedLookBoost'
import { scoreServiceType } from './scoreServiceType'
import { scoreStyleTags } from './scoreStyleTags'

export function scoreCatalogRow(
  request: MatchRequestRecord,
  row: CatalogPortfolioRow,
): ScoredPortfolioItem {
  const components: ComponentScore[] = [
    scoreServiceType(request.category, row.category, row.professionals.category),
    scoreStyleTags(request.tags, row.portfolio_item_tags),
    scoreDesiredStyle(request.desired_style_text, request.vision_notes, row),
    scoreCurrentLook(request.current_state_text, row),
    scoreBudget(request, row.price),
    scoreLocation(request.location_text, row.professionals.city),
    scoreQuality(row),
    scoreSavedLookBoost(request.saved_look_portfolio_item_id, row.id),
  ]

  const raw = components.reduce((sum, c) => sum + c.points, 0)
  const total = roundScore(clamp(raw, 0, 100))
  const reasons = buildCuratedReasons(components)

  return {
    portfolio_item_id: row.id,
    professional_id: row.professional_id,
    total,
    components,
    reasons,
  }
}
