import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { savedContext, type SavedState } from './savedContext'
import type { RequestSubmission } from '../types'

const STORAGE_KEY = 'trustfall:saved:v1'

function readInitialSavedState() {
  if (typeof window === 'undefined') {
    return {
      savedPortfolioItemIds: [],
      savedProfessionalIds: [],
      requestSubmissions: [],
    }
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return {
      savedPortfolioItemIds: [],
      savedProfessionalIds: [],
      requestSubmissions: [],
    }
  }

  try {
    const parsed = JSON.parse(raw) as {
      savedPortfolioItemIds?: string[]
      savedProfessionalIds?: string[]
      requestSubmissions?: RequestSubmission[]
    }
    return {
      savedPortfolioItemIds: parsed.savedPortfolioItemIds ?? [],
      savedProfessionalIds: parsed.savedProfessionalIds ?? [],
      requestSubmissions: parsed.requestSubmissions ?? [],
    }
  } catch {
    return {
      savedPortfolioItemIds: [],
      savedProfessionalIds: [],
      requestSubmissions: [],
    }
  }
}

export function SavedProvider({ children }: { children: ReactNode }) {
  const [savedPortfolioItemIds, setSavedPortfolioItemIds] = useState<string[]>(
    () => readInitialSavedState().savedPortfolioItemIds,
  )
  const [savedProfessionalIds, setSavedProfessionalIds] = useState<string[]>(
    () => readInitialSavedState().savedProfessionalIds,
  )
  const [requestSubmissions, setRequestSubmissions] = useState<RequestSubmission[]>(
    () => readInitialSavedState().requestSubmissions,
  )

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        savedPortfolioItemIds,
        savedProfessionalIds,
        requestSubmissions,
      }),
    )
  }, [savedPortfolioItemIds, savedProfessionalIds, requestSubmissions])

  const value = useMemo<SavedState>(
    () => ({
      savedPortfolioItemIds,
      savedProfessionalIds,
      requestSubmissions,
      isPortfolioItemSaved: (itemId: string) => savedPortfolioItemIds.includes(itemId),
      isProfessionalSaved: (professionalId: string) =>
        savedProfessionalIds.includes(professionalId),
      togglePortfolioItem: (itemId: string) => {
        setSavedPortfolioItemIds((current) =>
          current.includes(itemId)
            ? current.filter((id) => id !== itemId)
            : [itemId, ...current],
        )
      },
      toggleProfessional: (professionalId: string) => {
        setSavedProfessionalIds((current) =>
          current.includes(professionalId)
            ? current.filter((id) => id !== professionalId)
            : [professionalId, ...current],
        )
      },
      addRequestSubmission: (submission: RequestSubmission) => {
        setRequestSubmissions((current) => [submission, ...current])
      },
    }),
    [savedPortfolioItemIds, savedProfessionalIds, requestSubmissions],
  )

  return <savedContext.Provider value={value}>{children}</savedContext.Provider>
}
