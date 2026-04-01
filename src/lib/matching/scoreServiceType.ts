import { roundScore } from './numbers'
import type { ComponentScore } from './types'
import { MATCH_WEIGHTS } from './weights'
import { normalizeCategory } from './text'

/**
 * Service type fit: portfolio item category and professional category vs request category.
 */
export function scoreServiceType(
  requestCategory: string | null | undefined,
  itemCategory: string,
  proCategory: string,
): ComponentScore {
  const max = MATCH_WEIGHTS.serviceType
  if (!requestCategory?.trim()) {
    return {
      key: 'service_type',
      points: roundScore(max * 0.72),
      max,
      label: 'open category',
    }
  }

  const r = normalizeCategory(requestCategory)
  const ic = normalizeCategory(itemCategory)
  const pc = normalizeCategory(proCategory)

  if (r === ic && r === pc) {
    return { key: 'service_type', points: max, max, label: 'service match' }
  }
  if (r === ic || r === pc) {
    return { key: 'service_type', points: roundScore(max * 0.88), max, label: 'service match' }
  }
  if (ic.includes(r) || r.includes(ic) || pc.includes(r) || r.includes(pc)) {
    return { key: 'service_type', points: roundScore(max * 0.55), max, label: 'related service' }
  }

  return { key: 'service_type', points: 0, max, label: 'category mismatch' }
}
