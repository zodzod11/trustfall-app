import { createContext } from 'react'
import type { RequestSubmission } from '@/types'

export type SavedState = {
  savedPortfolioItemIds: string[]
  savedProfessionalIds: string[]
  requestSubmissions: RequestSubmission[]
  isPortfolioItemSaved: (itemId: string) => boolean
  isProfessionalSaved: (professionalId: string) => boolean
  togglePortfolioItem: (itemId: string) => void
  toggleProfessional: (professionalId: string) => void
  addRequestSubmission: (submission: RequestSubmission) => void
}

export const savedContext = createContext<SavedState | null>(null)
