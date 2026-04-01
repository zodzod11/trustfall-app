import { clamp, parseMoney, roundScore } from './numbers'
import type { ComponentScore, MatchRequestRecord } from './types'
import { MATCH_WEIGHTS } from './weights'

/** Budget fit: request range vs portfolio item price */
export function scoreBudget(request: MatchRequestRecord, itemPrice: string | number | null): ComponentScore {
  const max = MATCH_WEIGHTS.budget
  const lo = parseMoney(request.budget_min)
  const hi = parseMoney(request.budget_max)
  const price = parseMoney(itemPrice)

  if (lo === null && hi === null) {
    return {
      key: 'budget',
      points: roundScore(max * 0.68),
      max,
      label: 'no budget given',
    }
  }

  if (price === null) {
    return {
      key: 'budget',
      points: roundScore(max * 0.45),
      max,
      label: 'price on request',
    }
  }

  const minR = lo ?? hi ?? price
  const maxR = hi ?? lo ?? price
  const low = Math.min(minR, maxR)
  const high = Math.max(minR, maxR)

  if (price >= low && price <= high) {
    return { key: 'budget', points: max, max, label: 'fits your budget' }
  }

  const dist =
    price < low
      ? (low - price) / Math.max(low * 0.15, 1)
      : (price - high) / Math.max(high * 0.15, 1)
  const t = clamp(1 - dist / 8, 0, 1)
  return {
    key: 'budget',
    points: roundScore(max * t),
    max,
    label: t >= 0.55 ? 'close to your budget' : 'budget stretch',
  }
}
