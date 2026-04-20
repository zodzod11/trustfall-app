import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { STORAGE_MATCH_DRAFT_V1 } from '@/constants/storage-keys'
import type { MatchRequestDraft } from '@/types'

type MatchDraftContextValue = {
  draft: MatchRequestDraft | null
  setDraft: (d: MatchRequestDraft | null) => void
  hydrated: boolean
}

const MatchDraftContext = createContext<MatchDraftContextValue | null>(null)

export function MatchDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<MatchRequestDraft | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const hasLocalChangeRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_MATCH_DRAFT_V1)
        if (cancelled || hasLocalChangeRef.current || !raw) {
          if (!cancelled) setHydrated(true)
          return
        }
        const parsed = JSON.parse(raw) as MatchRequestDraft
        setDraft(parsed)
      } catch {
        /* ignore corrupted local draft */
      } finally {
        if (!cancelled) setHydrated(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const updateDraft = useCallback((nextDraft: MatchRequestDraft | null) => {
    hasLocalChangeRef.current = true
    setDraft(nextDraft)
    void (async () => {
      try {
        if (nextDraft) {
          await AsyncStorage.setItem(STORAGE_MATCH_DRAFT_V1, JSON.stringify(nextDraft))
        } else {
          await AsyncStorage.removeItem(STORAGE_MATCH_DRAFT_V1)
        }
      } catch {
        /* ignore persistence failures */
      }
    })()
  }, [])

  return (
    <MatchDraftContext.Provider value={{ draft, setDraft: updateDraft, hydrated }}>
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
