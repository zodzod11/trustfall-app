import { professionalsSeed } from '@/data/seed'
import type { PortfolioItem, Professional } from '@/types'

export function findPortfolioItemById(portfolioItemId: string): {
  item: PortfolioItem
  professional: Professional
} | null {
  for (const pro of professionalsSeed) {
    const item = pro.portfolioItems.find((p) => p.id === portfolioItemId)
    if (item) return { item, professional: pro }
  }
  return null
}
