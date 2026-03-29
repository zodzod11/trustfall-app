import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Scroll to top on route change (mobile shell pattern). */
export function useScrollRestoration() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])
}
