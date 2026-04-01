import { useCallback, useEffect, useState } from 'react'
import { createClient } from '../lib/client'
import { fetchPublishedPortfolioItemsForProfessional } from '../lib/explore'
import type { PortfolioFeedItem } from '../components/explore/PortfolioCard'

export function useProfessionalPortfolio(professionalId: string | undefined) {
  const [items, setItems] = useState<PortfolioFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!professionalId) {
      setItems([])
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { items: next, error: err } = await fetchPublishedPortfolioItemsForProfessional(
      supabase,
      professionalId,
    )
    if (err) {
      setError(err)
      setItems([])
    } else {
      setItems(next)
    }
    setLoading(false)
  }, [professionalId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch pro portfolio on mount
    void load()
  }, [load])

  return { items, loading, error, refetch: load }
}
