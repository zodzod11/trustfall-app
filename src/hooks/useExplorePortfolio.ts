import { useCallback, useEffect, useState } from 'react'
import { createClient } from '../lib/client'
import { fetchPublishedPortfolioItems } from '../lib/explore'
import type { PortfolioFeedItem } from '../components/explore/PortfolioCard'

export type UseExplorePortfolioState = {
  items: PortfolioFeedItem[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/** Loads published portfolio catalog for Explore / Saved (portfolio-first). */
export function useExplorePortfolio(): UseExplorePortfolioState {
  const [items, setItems] = useState<PortfolioFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { items: next, error: err } = await fetchPublishedPortfolioItems(supabase)
    if (err) {
      setError(err)
      setItems([])
    } else {
      setItems(next)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch catalog on mount
    void load()
  }, [load])

  return { items, loading, error, refetch: load }
}
