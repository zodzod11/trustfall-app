import { useCallback, useEffect, useState } from 'react'
import { fetchPublishedPortfolioItems } from '@/lib/explore/fetchPublishedPortfolio'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { PortfolioFeedItem } from '@/types'

export type UseExplorePortfolioState = {
  items: PortfolioFeedItem[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  /** False when EXPO_PUBLIC_SUPABASE_URL is unset — use local seed feed instead */
  remoteEnabled: boolean
}

export function useExplorePortfolio(): UseExplorePortfolioState {
  const [items, setItems] = useState<PortfolioFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const remoteEnabled = isSupabaseConfigured

  const load = useCallback(async () => {
    if (!remoteEnabled) {
      setLoading(false)
      setError(null)
      setItems([])
      return
    }
    setLoading(true)
    setError(null)
    const { items: next, error: err } = await fetchPublishedPortfolioItems(supabase)
    if (err) {
      setError(err)
      setItems([])
    } else {
      setItems(next)
    }
    setLoading(false)
  }, [remoteEnabled])

  useEffect(() => {
    void load()
  }, [load])

  return { items, loading, error, refetch: load, remoteEnabled }
}
