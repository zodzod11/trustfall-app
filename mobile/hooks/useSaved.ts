import { useContext } from 'react'
import { savedContext } from '@/contexts/saved-context'

export function useSaved() {
  const ctx = useContext(savedContext)
  if (!ctx) {
    throw new Error('useSaved must be used inside SavedProvider')
  }
  return ctx
}
