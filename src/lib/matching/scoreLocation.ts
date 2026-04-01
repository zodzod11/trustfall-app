import { tokenize, uniqueTokens } from './text'
import type { ComponentScore } from './types'
import { MATCH_WEIGHTS } from './weights'
import { roundScore } from './numbers'

/** Location fit: free-text location vs professional city */
export function scoreLocation(
  locationText: string | null | undefined,
  proCity: string,
): ComponentScore {
  const max = MATCH_WEIGHTS.location
  const q = locationText?.trim().toLowerCase() ?? ''
  if (!q) {
    return {
      key: 'location',
      points: roundScore(max * 0.62),
      max,
      label: 'any location',
    }
  }

  const city = proCity.trim().toLowerCase()
  if (!city) {
    return { key: 'location', points: roundScore(max * 0.4), max, label: 'location unclear' }
  }

  if (city.includes(q) || q.includes(city)) {
    return { key: 'location', points: max, max, label: 'near your area' }
  }

  const qTokens = uniqueTokens(tokenize(locationText))
  const cTokens = uniqueTokens(tokenize(proCity))
  const hit = qTokens.filter((t) => cTokens.includes(t)).length
  if (hit > 0) {
    const ratio = hit / Math.max(qTokens.length, 1)
    return {
      key: 'location',
      points: roundScore(max * (0.55 + 0.45 * ratio)),
      max,
      label: 'regional match',
    }
  }

  return { key: 'location', points: roundScore(max * 0.18), max, label: 'different area' }
}
