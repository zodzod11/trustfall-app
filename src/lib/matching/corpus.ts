import type { CatalogPortfolioRow } from './types'
import { tokenize, uniqueTokens } from './text'

/** Portfolio-first text corpus for overlap scorers */
export function buildPortfolioCorpusShared(row: CatalogPortfolioRow): string[] {
  const tagTokens = (row.portfolio_item_tags ?? []).flatMap((t) => tokenize(t.tag))
  const title = tokenize(row.service_title)
  const proTitle = tokenize(row.professionals.title)
  const about = tokenize((row.professionals.about ?? '').slice(0, 600))
  return uniqueTokens([...tagTokens, ...title, ...proTitle, ...about])
}
