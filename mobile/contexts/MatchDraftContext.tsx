import { createContext, useContext, useState, type ReactNode } from 'react'
import type { MatchRequestDraft } from '@/types'

type MatchDraftContextValue = {
  draft: MatchRequestDraft | null
  setDraft: (d: MatchRequestDraft | null) => void
}

const MatchDraftContext = createContext<MatchDraftContextValue | null>(null)

export function MatchDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<MatchRequestDraft | null>(null)
  return (
    <MatchDraftContext.Provider value={{ draft, setDraft }}>
      {children}
    </MatchDraftContext.Provider>
  )
}

export function useMatchDraft() {
  const ctx = useContext(MatchDraftContext)
  if (!ctx) {
    throw new Error('useMatchDraft must be used within MatchDraftProvider')
  }
  return ctx
}
