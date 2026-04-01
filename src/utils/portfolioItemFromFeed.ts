import type { PortfolioFeedItem } from '../components/explore/PortfolioCard'
import type { PortfolioItem, Professional } from '../types'

export function portfolioItemFromFeed(item: PortfolioFeedItem): PortfolioItem {
  return {
    id: item.id,
    professionalId: item.professionalId,
    beforeImageUrl: item.beforeImageUrl,
    afterImageUrl: item.afterImageUrl,
    price: item.price,
    serviceTitle: item.serviceTitle,
    tags: item.tags,
    category: item.category,
  }
}

/** Build a `Professional` from Explore feed rows sharing the same `professionalId`. */
export function professionalFromFeedItems(
  professionalId: string,
  feed: PortfolioFeedItem[],
): Professional | null {
  const list = feed.filter((i) => i.professionalId === professionalId)
  if (list.length === 0) return null
  const f = list[0]
  return {
    id: professionalId,
    displayName: f.professionalName,
    title: f.professionalTitle,
    category: f.category,
    city: f.location,
    rating: f.professionalRating ?? 0,
    reviewCount: f.professionalReviewCount ?? 0,
    yearsExperience: f.professionalYearsExperience ?? 0,
    about: f.professionalAbout ?? '',
    bookingPhone: f.professionalPhone,
    bookingEmail: f.professionalEmail,
    portfolioItems: list.map(portfolioItemFromFeed),
  }
}
