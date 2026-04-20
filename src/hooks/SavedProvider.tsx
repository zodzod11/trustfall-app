import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createClient } from '../lib/client'
import {
  fetchSavedSnapshot,
  isCanonicalSavedEntityId,
  removeSavedPortfolioItem,
  removeSavedProfessional,
  savePortfolioItem,
  saveProfessional,
} from '../lib/saved/service'
import {
  normalizeSavedPortfolioItemId,
  normalizeSavedProfessionalId,
} from '../lib/demoCatalogIds'
import { savedContext, type SavedState } from './savedContext'
import type { RequestSubmission } from '../types'

const LEGACY_SAVED_STORAGE_KEY = 'trustfall:saved:v1'
const REQUEST_SUBMISSIONS_STORAGE_KEY = 'trustfall:request-submissions:v1'
const SAVED_CACHE_PREFIX = 'trustfall:saved-cache:v2'

function readInitialRequestSubmissions() {
  if (typeof window === 'undefined') return []

  const nextRaw = window.localStorage.getItem(REQUEST_SUBMISSIONS_STORAGE_KEY)
  if (nextRaw) {
    try {
      return JSON.parse(nextRaw) as RequestSubmission[]
    } catch {
      return []
    }
  }

  const legacyRaw = window.localStorage.getItem(LEGACY_SAVED_STORAGE_KEY)
  if (!legacyRaw) return []
  try {
    const parsed = JSON.parse(legacyRaw) as { requestSubmissions?: RequestSubmission[] }
    return parsed.requestSubmissions ?? []
  } catch {
    return []
  }
}

function readSavedCache(userId: string) {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(`${SAVED_CACHE_PREFIX}:${userId}`)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as {
      savedPortfolioItemIds?: string[]
      savedProfessionalIds?: string[]
    }
    return {
      savedPortfolioItemIds: parsed.savedPortfolioItemIds ?? [],
      savedProfessionalIds: parsed.savedProfessionalIds ?? [],
    }
  } catch {
    return null
  }
}

function writeSavedCache(userId: string, state: { savedPortfolioItemIds: string[]; savedProfessionalIds: string[] }) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(`${SAVED_CACHE_PREFIX}:${userId}`, JSON.stringify(state))
}

function mergeSavedIds(
  cachedIds: string[],
  remoteIds: string[],
  normalizeId: (id: string) => string,
) {
  const normalizedLocalIds = cachedIds.map(normalizeId)
  const localOnlyIds = normalizedLocalIds.filter((id) => !isCanonicalSavedEntityId(id))
  const canonicalIds = [...normalizedLocalIds, ...remoteIds].filter(isCanonicalSavedEntityId)
  return [...new Set([...localOnlyIds, ...canonicalIds])]
}

export function SavedProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const [savedPortfolioItemIds, setSavedPortfolioItemIds] = useState<string[]>([])
  const [savedProfessionalIds, setSavedProfessionalIds] = useState<string[]>([])
  const [requestSubmissions, setRequestSubmissions] = useState<RequestSubmission[]>(() =>
    readInitialRequestSubmissions(),
  )
  const [hydrated, setHydrated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeUserId, setActiveUserId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError(null)

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError) {
      setSavedPortfolioItemIds([])
      setSavedProfessionalIds([])
      setActiveUserId(null)
      setError(userError.message)
      setHydrated(true)
      return
    }

    const userId = userData.user?.id ?? null
    setActiveUserId(userId)

    if (!userId) {
      setSavedPortfolioItemIds([])
      setSavedProfessionalIds([])
      setHydrated(true)
      return
    }

    const cached = readSavedCache(userId)
    if (cached) {
      setSavedPortfolioItemIds(cached.savedPortfolioItemIds)
      setSavedProfessionalIds(cached.savedProfessionalIds)
    }

    const snapshot = await fetchSavedSnapshot(supabase)
    if (!snapshot.ok) {
      setError(snapshot.error)
      setHydrated(true)
      return
    }

    const mergedPortfolioIds = mergeSavedIds(
      cached?.savedPortfolioItemIds ?? [],
      snapshot.data.savedPortfolioItemIds,
      normalizeSavedPortfolioItemId,
    )
    const mergedProfessionalIds = mergeSavedIds(
      cached?.savedProfessionalIds ?? [],
      snapshot.data.savedProfessionalIds,
      normalizeSavedProfessionalId,
    )
    setSavedPortfolioItemIds(mergedPortfolioIds)
    setSavedProfessionalIds(mergedProfessionalIds)
    writeSavedCache(userId, {
      savedPortfolioItemIds: mergedPortfolioIds,
      savedProfessionalIds: mergedProfessionalIds,
    })
    setHydrated(true)
  }, [supabase])

  const reportToggleFailure = useCallback((message: string) => {
    setError(message)
    if (typeof window !== 'undefined') {
      window.alert(message)
    }
  }, [])

  useEffect(() => {
    const refreshTimer = setTimeout(() => {
      void refresh()
    }, 0)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh()
    })
    return () => {
      clearTimeout(refreshTimer)
      subscription.unsubscribe()
    }
  }, [refresh, supabase])

  useEffect(() => {
    if (!hydrated || !activeUserId) return
    writeSavedCache(activeUserId, {
      savedPortfolioItemIds,
      savedProfessionalIds,
    })
  }, [activeUserId, hydrated, savedPortfolioItemIds, savedProfessionalIds])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      REQUEST_SUBMISSIONS_STORAGE_KEY,
      JSON.stringify(requestSubmissions),
    )
  }, [requestSubmissions])

  const value = useMemo<SavedState>(
    () => ({
      savedPortfolioItemIds,
      savedProfessionalIds,
      requestSubmissions,
      hydrated,
      error,
      isPortfolioItemSaved: (itemId: string) =>
        savedPortfolioItemIds.includes(normalizeSavedPortfolioItemId(itemId)),
      isProfessionalSaved: (professionalId: string) =>
        savedProfessionalIds.includes(normalizeSavedProfessionalId(professionalId)),
      togglePortfolioItem: async (itemId: string) => {
        const normalizedItemId = normalizeSavedPortfolioItemId(itemId)
        const previous = savedPortfolioItemIds
        const alreadySaved = previous.includes(normalizedItemId)
        const next = alreadySaved
          ? previous.filter((id) => id !== normalizedItemId)
          : [normalizedItemId, ...previous]

        setSavedPortfolioItemIds(next)

        if (!isCanonicalSavedEntityId(normalizedItemId)) return

        const result = alreadySaved
          ? await removeSavedPortfolioItem(supabase, normalizedItemId)
          : await savePortfolioItem(supabase, normalizedItemId)

        if (!result.ok) {
          setSavedPortfolioItemIds(previous)
          reportToggleFailure(result.error)
        }
      },
      toggleProfessional: async (professionalId: string) => {
        const normalizedProfessionalId = normalizeSavedProfessionalId(professionalId)
        const previous = savedProfessionalIds
        const alreadySaved = previous.includes(normalizedProfessionalId)
        const next = alreadySaved
          ? previous.filter((id) => id !== normalizedProfessionalId)
          : [normalizedProfessionalId, ...previous]

        setSavedProfessionalIds(next)

        if (!isCanonicalSavedEntityId(normalizedProfessionalId)) return

        const result = alreadySaved
          ? await removeSavedProfessional(supabase, normalizedProfessionalId)
          : await saveProfessional(supabase, normalizedProfessionalId)

        if (!result.ok) {
          setSavedProfessionalIds(previous)
          reportToggleFailure(result.error)
        }
      },
      refresh,
      addRequestSubmission: (submission: RequestSubmission) => {
        setRequestSubmissions((current) => [submission, ...current])
      },
    }),
    [
      error,
      hydrated,
      refresh,
      reportToggleFailure,
      requestSubmissions,
      savedPortfolioItemIds,
      savedProfessionalIds,
      supabase,
    ],
  )

  return <savedContext.Provider value={value}>{children}</savedContext.Provider>
}
