import type { MatchResultsRankedProfessional } from '../../types'
import { portfolioImagePublicUrl } from '../explore/publicUrls'
import type { MatchResultRowWithJoin } from './fetchMatchResults'

function numScore(v: string | number): number {
  if (typeof v === 'number') return v
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function ratingNum(r: string | number | null | undefined): number {
  if (r === null || r === undefined) return 0
  return typeof r === 'number' ? r : Number(r) || 0
}

/**
 * Groups portfolio-first ranked rows into the UI shape (one card per professional,
 * up to three pieces each), preserving global rank order by first appearance.
 */
export function mapMatchRowsToRankedProfessionals(
  rows: MatchResultRowWithJoin[],
): MatchResultsRankedProfessional[] {
  const sorted = [...rows].sort((a, b) => a.rank - b.rank)
  const order: string[] = []
  const seen = new Set<string>()
  for (const r of sorted) {
    if (!seen.has(r.professional_id)) {
      seen.add(r.professional_id)
      order.push(r.professional_id)
    }
  }

  const byPro = new Map<string, MatchResultRowWithJoin[]>()
  for (const r of sorted) {
    const list = byPro.get(r.professional_id) ?? []
    if (list.length < 3) {
      list.push(r)
      byPro.set(r.professional_id, list)
    }
  }

  const out: MatchResultsRankedProfessional[] = []
  for (const pid of order.slice(0, 6)) {
    const group = byPro.get(pid) ?? []
    const best = group[0]
    if (!best) continue

    const pi = best.portfolio_items
    const prof = pi.professionals
    const after = pi.after_image_path ?? pi.before_image_path
    const heroUrl = portfolioImagePublicUrl(after)

    const matchedPieces = group.map((p) => {
      const ppi = p.portfolio_items
      const url = portfolioImagePublicUrl(ppi.after_image_path ?? ppi.before_image_path)
      return {
        id: p.portfolio_item_id,
        imageUrl: url || '',
        serviceTitle: ppi.service_title,
        scoreLabel: `${Math.round(numScore(p.total_score))}% fit`,
      }
    })

    const bestScore = numScore(best.total_score)

    out.push({
      id: pid,
      name: prof.display_name,
      title: prof.title,
      city: prof.city,
      rating: ratingNum(prof.rating),
      portfolioImageUrl: heroUrl || (matchedPieces[0]?.imageUrl ?? ''),
      portfolioItemId: best.portfolio_item_id,
      serviceTitle: pi.service_title,
      phoneNumber: prof.booking_phone ?? '+17135551234',
      proEmail: prof.booking_email ?? undefined,
      scoreLabel: `${Math.round(bestScore)}% fit`,
      labels: (best.reasons ?? []).slice(0, 3),
      matchedPieces,
      score: bestScore,
    })
  }

  return out.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
}
