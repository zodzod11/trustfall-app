import { createContext } from 'react'
import type { RequestSubmission } from '@/types'

export type SavedState = {
  savedPortfolioItemIds: string[]
  savedProfessionalIds: string[]
  requestSubmissions: RequestSubmission[]
  hydrated: boolean
  error: string | null
  isPortfolioItemSaved: (itemId: string) => boolean
  isProfessionalSaved: (professionalId: string) => boolean
  togglePortfolioItem: (itemId: string) => Promise<void>
  toggleProfessional: (professionalId: string) => Promise<void>
  refresh: () => Promise<void>
  addRequestSubmission: (submission: RequestSubmission) => void
}

export const savedContext = createContext<SavedState | null>(null)
