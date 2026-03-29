import { useContext } from 'react'
import { savedContext } from './savedContext'

export function useSaved() {
  const ctx = useContext(savedContext)
  if (!ctx) {
    throw new Error('useSaved must be used inside SavedProvider')
  }
  return ctx
}
