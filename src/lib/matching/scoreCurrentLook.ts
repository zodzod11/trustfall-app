import { overlapRatio, tokenize, uniqueTokens } from './text'
import type { CatalogPortfolioRow, ComponentScore } from './types'
import { MATCH_WEIGHTS } from './weights'
import { roundScore } from './numbers'
import { buildPortfolioCorpusShared } from './corpus'

/**
 * Supporting signal: current look description vs portfolio corpus (lighter weight in weights.ts).
 */
export function scoreCurrentLook(
  currentStateText: string | null | undefined,
  row: CatalogPortfolioRow,
): ComponentScore {
  const max = MATCH_WEIGHTS.currentLook
  const requestTokens = uniqueTokens(tokenize(currentStateText))
  if (requestTokens.length === 0) {
    return {
      key: 'current_look',
      points: roundScore(max * 0.5),
      max,
      label: 'no current-state notes',
    }
  }

  const corpus = buildPortfolioCorpusShared(row)
  const ratio = overlapRatio(requestTokens, corpus)
  return {
    key: 'current_look',
    points: roundScore(max * Math.min(1, ratio * 1.05)),
    max,
    label: ratio >= 0.25 ? 'works with your starting point' : 'soft current-look fit',
  }
}
