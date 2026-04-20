import { professionalsSeed } from '@/data/seed'
import type { PortfolioFeedItem } from '@/types'

export function buildPortfolioFeed(): PortfolioFeedItem[] {
  return professionalsSeed.flatMap((pro) =>
    pro.portfolioItems.map((item) => ({
      ...item,
      professionalName: pro.displayName,
      professionalTitle: pro.title,
      location: pro.city,
      professionalPhone: pro.bookingPhone,
      professionalEmail: pro.bookingEmail,
      professionalRating: pro.rating,
      professionalReviewCount: pro.reviewCount,
      professionalRequestCount: pro.requestCount,
      professionalYearsExperience: pro.yearsExperience,
      professionalAbout: pro.about,
    })),
  )
}
