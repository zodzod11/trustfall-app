import { useCallback, useEffect, useState } from 'react'
import { createClient } from '../lib/client'
import { fetchExploreDetailBundle } from '../lib/explore'
import type { ExploreDetailBundle } from '../lib/explore'

export function useExplorePortfolioDetail(portfolioItemId: string | undefined) {
  const [bundle, setBundle] = useState<ExploreDetailBundle | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!portfolioItemId) {
      setBundle({ item: null, moreFromSamePro: [], error: null })
      setLoading(false)
      return
    }
    setLoading(true)
    const supabase = createClient()
    const next = await fetchExploreDetailBundle(supabase, portfolioItemId)
    setBundle(next)
    setLoading(false)
  }, [portfolioItemId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch detail on route
    void load()
  }, [load])

  return {
    item: bundle?.item ?? null,
    moreFromSamePro: bundle?.moreFromSamePro ?? [],
    error: bundle?.error ?? null,
    loading,
    refetch: load,
  }
}
