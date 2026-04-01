import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { STORAGE_SAVED_V1 } from '@/constants/storage-keys'
import { savedContext, type SavedState } from '@/contexts/saved-context'
import type { RequestSubmission } from '@/types'

type Persisted = {
  savedPortfolioItemIds?: string[]
  savedProfessionalIds?: string[]
  requestSubmissions?: RequestSubmission[]
}

const empty: SavedState['savedPortfolioItemIds'] = []

async function readInitial(): Promise<{
  savedPortfolioItemIds: string[]
  savedProfessionalIds: string[]
  requestSubmissions: RequestSubmission[]
}> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_SAVED_V1)
    if (!raw) {
      return { savedPortfolioItemIds: [], savedProfessionalIds: [], requestSubmissions: [] }
    }
    const parsed = JSON.parse(raw) as Persisted
    return {
      savedPortfolioItemIds: parsed.savedPortfolioItemIds ?? [],
      savedProfessionalIds: parsed.savedProfessionalIds ?? [],
      requestSubmissions: parsed.requestSubmissions ?? [],
    }
  } catch {
    return { savedPortfolioItemIds: [], savedProfessionalIds: [], requestSubmissions: [] }
  }
}

export function SavedProvider({ children }: { children: ReactNode }) {
  const [savedPortfolioItemIds, setSavedPortfolioItemIds] = useState<string[]>(empty)
  const [savedProfessionalIds, setSavedProfessionalIds] = useState<string[]>(empty)
  const [requestSubmissions, setRequestSubmissions] = useState<RequestSubmission[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let cancelled = false
    readInitial().then((data) => {
      if (cancelled) return
      setSavedPortfolioItemIds(data.savedPortfolioItemIds)
      setSavedProfessionalIds(data.savedProfessionalIds)
      setRequestSubmissions(data.requestSubmissions)
      setHydrated(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    void AsyncStorage.setItem(
      STORAGE_SAVED_V1,
      JSON.stringify({
        savedPortfolioItemIds,
        savedProfessionalIds,
        requestSubmissions,
      }),
    )
  }, [hydrated, savedPortfolioItemIds, savedProfessionalIds, requestSubmissions])

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
          current.includes(itemId) ? current.filter((id) => id !== itemId) : [itemId, ...current],
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
