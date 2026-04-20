import { rankingLocationQuery } from '@/lib/match/refinementFormat'
import type {
  MatchRequestDraft,
  MatchResultsRankedProfessional,
  PortfolioFeedItem,
} from '@/types'

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function rankProfessionals(
  request?: MatchRequestDraft,
  catalogFeed: PortfolioFeedItem[] = [],
): MatchResultsRankedProfessional[] {
  const query = rankingLocationQuery(request?.refinement ?? {}, request?.location ?? '')
  const requestedTags = (request?.tags ?? []).map(normalizeToken)

  const catalogByProfessional = Array.from(
    catalogFeed.reduce((map, item) => {
      const list = map.get(item.professionalId) ?? []
      list.push(item)
      map.set(item.professionalId, list)
      return map
    }, new Map<string, PortfolioFeedItem[]>()),
  )

  const scored: MatchResultsRankedProfessional[] = []
  for (const [professionalId, items] of catalogByProfessional) {
    const first = items[0]
    if (!first) continue

    const locationMatch = query.length > 0 && first.location.toLowerCase().includes(query)
    const proRating = first.professionalRating ?? 4.5

    const rankedItems = items
      .map((item) => {
        const itemTagSet = new Set(item.tags.map(normalizeToken))
        const tagMatchCount = requestedTags.filter((tag) => itemTagSet.has(tag)).length
        const categoryMatch =
          Boolean(request?.category) && request?.category === item.category

        const categoryScore = categoryMatch ? 18 : 0
        const locationScore = locationMatch ? 12 : 0
        const tagScore = Math.min(tagMatchCount * 6, 18)
        const imageBonus = request?.imageName ? 3 : 0
        const notesBonus = request?.notes.trim() ? 2 : 0
        const proQualityScore = (proRating - 4) * 7

        const score = Math.min(
          99,
          Math.round(
            58 +
              categoryScore +
              locationScore +
              tagScore +
              imageBonus +
              notesBonus +
              proQualityScore,
          ),
        )

        return {
          item,
          score,
          categoryMatch,
          tagMatchCount,
        }
      })
      .sort((a, b) => b.score - a.score)

    const bestItemResult = rankedItems[0]
    const bestItem = bestItemResult?.item ?? items[0]
    const bestScore = bestItemResult?.score ?? Math.round(58 + (proRating - 4) * 7)

    const labels: string[] = []
    if (bestItemResult?.categoryMatch) labels.push('Category match')
    if (locationMatch) labels.push('Near your location')
    if ((bestItemResult?.tagMatchCount ?? 0) > 0) {
      labels.push(`${bestItemResult?.tagMatchCount} tag match`)
    }
    if (!labels.length) labels.push('Top rated')

    scored.push({
        id: professionalId,
        name: first.professionalName,
        title: first.professionalTitle,
        city: first.location,
        rating: proRating,
        portfolioImageUrl: bestItem?.afterImageUrl ?? bestItem?.beforeImageUrl ?? '',
        portfolioItemId: bestItem?.id ?? `fallback-${professionalId}`,
        serviceTitle: bestItem?.serviceTitle ?? `${first.professionalTitle} style`,
        phoneNumber: first.professionalPhone ?? '+17135551234',
        proEmail: first.professionalEmail,
        score: bestScore,
        scoreLabel: `${bestScore}% fit`,
        labels: labels.slice(0, 3),
        matchedPieces: rankedItems.slice(0, 3).map(({ item, score }) => ({
          id: item.id,
          imageUrl: item.afterImageUrl ?? item.beforeImageUrl,
          beforeImageUrl: item.beforeImageUrl,
          serviceTitle: item.serviceTitle,
          scoreLabel: `${score}% fit`,
        })),
      })
  }

  scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  const targetCount = Math.min(6, Math.max(3, scored.length))
  return scored.slice(0, targetCount)
}
