import { Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  STORAGE_REQUEST_SUBMISSIONS_V1,
  STORAGE_SAVED_CACHE_PREFIX_V2,
  STORAGE_SAVED_V1,
} from '@/constants/storage-keys'
import { savedContext, type SavedState } from '@/contexts/saved-context'
import { supabase } from '@/lib/supabase'
import type { RequestSubmission } from '@/types'
import {
  fetchSavedSnapshot,
  isCanonicalSavedEntityId,
  removeSavedPortfolioItem,
  removeSavedProfessional,
  savePortfolioItem,
  saveProfessional,
} from '../../src/lib/saved/service'
import {
  normalizeSavedPortfolioItemId,
  normalizeSavedProfessionalId,
} from '../../src/lib/demoCatalogIds'

async function readSavedCache(userId: string): Promise<{
  savedPortfolioItemIds: string[]
  savedProfessionalIds: string[]
} | null> {
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_SAVED_CACHE_PREFIX_V2}:${userId}`)
    if (!raw) return null
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

async function writeSavedCache(
  userId: string,
  state: { savedPortfolioItemIds: string[]; savedProfessionalIds: string[] },
) {
  await AsyncStorage.setItem(`${STORAGE_SAVED_CACHE_PREFIX_V2}:${userId}`, JSON.stringify(state))
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

async function readInitialRequestSubmissions(): Promise<RequestSubmission[]> {
  try {
    const nextRaw = await AsyncStorage.getItem(STORAGE_REQUEST_SUBMISSIONS_V1)
    if (nextRaw) {
      return JSON.parse(nextRaw) as RequestSubmission[]
    }

    const legacyRaw = await AsyncStorage.getItem(STORAGE_SAVED_V1)
    if (!legacyRaw) return []
    const parsed = JSON.parse(legacyRaw) as { requestSubmissions?: RequestSubmission[] }
    return parsed.requestSubmissions ?? []
  } catch {
    return []
  }
}

export function SavedProvider({ children }: { children: ReactNode }) {
  const [savedPortfolioItemIds, setSavedPortfolioItemIds] = useState<string[]>([])
  const [savedProfessionalIds, setSavedProfessionalIds] = useState<string[]>([])
  const [requestSubmissions, setRequestSubmissions] = useState<RequestSubmission[]>([])
  const [requestsHydrated, setRequestsHydrated] = useState(false)
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

    const cached = await readSavedCache(userId)
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
    await writeSavedCache(userId, {
      savedPortfolioItemIds: mergedPortfolioIds,
      savedProfessionalIds: mergedProfessionalIds,
    })
    setHydrated(true)
  }, [])

  const reportToggleFailure = useCallback((message: string) => {
    setError(message)
    Alert.alert('Could not update saved items', message)
  }, [])

  useEffect(() => {
    let cancelled = false

    readInitialRequestSubmissions().then((rows) => {
      if (cancelled) return
      setRequestSubmissions(rows)
      setRequestsHydrated(true)
    })

    const refreshTimer = setTimeout(() => {
      void refresh()
    }, 0)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh()
    })

    return () => {
      cancelled = true
      clearTimeout(refreshTimer)
      subscription.unsubscribe()
    }
  }, [refresh])

  useEffect(() => {
    if (!hydrated || !activeUserId) return
    void writeSavedCache(activeUserId, {
      savedPortfolioItemIds,
      savedProfessionalIds,
    })
  }, [activeUserId, hydrated, savedPortfolioItemIds, savedProfessionalIds])

  useEffect(() => {
    if (!requestsHydrated) return
    void AsyncStorage.setItem(
      STORAGE_REQUEST_SUBMISSIONS_V1,
      JSON.stringify(requestSubmissions),
    )
  }, [requestSubmissions, requestsHydrated])

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
    ],
  )

  return <savedContext.Provider value={value}>{children}</savedContext.Provider>
}
