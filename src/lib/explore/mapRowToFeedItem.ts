import type { PortfolioFeedItem } from '../../components/explore/PortfolioCard'
import type { ServiceCategory } from '../../types'
import { portfolioImagePublicUrl } from './publicUrls'
import type { PortfolioExploreDbRow } from './types'

function parsePrice(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const n = Number(String(value).replace(/[$,]/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

function parseRating(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  const n = typeof value === 'number' ? value : Number(String(value))
  return Number.isFinite(n) ? n : 0
}

/** Map DB category string to UI union (seed-aligned). */
export function parseServiceCategory(raw: string): ServiceCategory {
  const v = raw.toLowerCase().trim()
  if (v === 'barber' || v === 'hair' || v === 'nails' || v === 'makeup') {
    return v
  }
  return 'hair'
}

export function mapPortfolioRowToFeedItem(row: PortfolioExploreDbRow): PortfolioFeedItem {
  const pro = row.professionals
  const tags = (row.portfolio_item_tags ?? []).map((t) => t.tag).filter(Boolean)
  const category = parseServiceCategory(row.category)
  const beforeUrl = portfolioImagePublicUrl(row.before_image_path)
  const afterUrl = portfolioImagePublicUrl(row.after_image_path)
  const price = parsePrice(row.price)
  const rating = parseRating(pro.rating)
  const reviewCount = pro.review_count ?? 0
  const years = pro.years_experience ?? 0

  return {
    id: row.id,
    professionalId: pro.id,
    beforeImageUrl: beforeUrl || afterUrl,
    afterImageUrl: afterUrl || beforeUrl,
    price,
    serviceTitle: row.service_title,
    tags,
    category,
    professionalName: pro.display_name,
    professionalTitle: pro.title,
    location: pro.city,
    professionalPhone: pro.booking_phone ?? undefined,
    professionalEmail: pro.booking_email ?? undefined,
    professionalRating: rating,
    professionalReviewCount: reviewCount,
    professionalYearsExperience: years,
    professionalAbout: pro.about ?? '',
  }
}
