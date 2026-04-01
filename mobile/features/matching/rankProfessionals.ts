import { professionalsSeed } from '@/data/seed'
import type { MatchRequestDraft, MatchResultsRankedProfessional } from '@/types'

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function rankProfessionals(
  request?: MatchRequestDraft,
): MatchResultsRankedProfessional[] {
  const query = request?.location.trim().toLowerCase() ?? ''
  const requestedTags = (request?.tags ?? []).map(normalizeToken)

  const scored = professionalsSeed
    .map((pro) => {
      const locationMatch =
        query.length > 0 && pro.city.toLowerCase().includes(query)
      const rankedItems = pro.portfolioItems
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
          const proQualityScore = (pro.rating - 4) * 7

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
      const bestItem = bestItemResult?.item ?? pro.portfolioItems[0]
      const bestScore = bestItemResult?.score ?? Math.round(58 + (pro.rating - 4) * 7)

      const labels: string[] = []
      if (bestItemResult?.categoryMatch) labels.push('Category match')
      if (locationMatch) labels.push('Near your location')
      if ((bestItemResult?.tagMatchCount ?? 0) > 0) {
        labels.push(`${bestItemResult?.tagMatchCount} tag match`)
      }
      if (!labels.length) labels.push('Top rated')

      return {
        id: pro.id,
        name: pro.displayName,
        title: pro.title,
        city: pro.city,
        rating: pro.rating,
        portfolioImageUrl: bestItem?.afterImageUrl ?? bestItem?.beforeImageUrl ?? '',
        portfolioItemId: bestItem?.id ?? `fallback-${pro.id}`,
        serviceTitle: bestItem?.serviceTitle ?? `${pro.title} style`,
        phoneNumber: pro.bookingPhone ?? '+17135551234',
        proEmail: pro.bookingEmail,
        score: bestScore,
        scoreLabel: `${bestScore}% fit`,
        labels: labels.slice(0, 3),
        matchedPieces: rankedItems.slice(0, 3).map(({ item, score }) => ({
          id: item.id,
          imageUrl: item.afterImageUrl ?? item.beforeImageUrl,
          serviceTitle: item.serviceTitle,
          scoreLabel: `${score}% fit`,
        })),
      }
    })
    .sort((a, b) => b.score - a.score)

  const targetCount = Math.min(6, Math.max(3, scored.length))
  return scored.slice(0, targetCount)
}
