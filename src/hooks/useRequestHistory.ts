import { useCallback, useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getRequestById, getRequestHistory } from '../lib/requests/service'
import type {
  RequestHistoryQuery,
  RequestRecord,
  RequestRecordWithAssets,
} from '../lib/requests/types'

type HistoryState = {
  items: RequestRecord[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useRequestHistory(
  supabase: SupabaseClient,
  query: RequestHistoryQuery = {},
): HistoryState {
  const limit = query.limit ?? 50
  const offset = query.offset ?? 0
  const status = query.status ?? null
  const [items, setItems] = useState<RequestRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(async () => {
    setRefreshKey((current) => current + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (cancelled) return
      setLoading(true)
      const result = await getRequestHistory(supabase, {
        limit,
        offset,
        ...(status ? { status } : {}),
      })
      if (cancelled) return
      if (result.error) {
        setItems([])
        setError(result.error)
      } else {
        setItems(result.data ?? [])
        setError(null)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [limit, offset, refreshKey, status, supabase])

  return { items, loading, error, refresh }
}

type DetailState = {
  item: RequestRecordWithAssets | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useRequestDetail(
  supabase: SupabaseClient,
  requestId: string | null | undefined,
): DetailState {
  const [item, setItem] = useState<RequestRecordWithAssets | null>(null)
  const [loading, setLoading] = useState(Boolean(requestId))
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(async () => {
    setRefreshKey((current) => current + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!requestId) {
        if (cancelled) return
        setItem(null)
        setError(null)
        setLoading(false)
        return
      }
      if (cancelled) return
      setLoading(true)
      const result = await getRequestById(supabase, requestId)
      if (cancelled) return
      if (result.error) {
        setItem(null)
        setError(result.error)
      } else {
        setItem(result.data)
        setError(null)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [refreshKey, requestId, supabase])

  return { item, loading, error, refresh }
}
