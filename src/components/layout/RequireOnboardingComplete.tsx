import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { createClient } from '../../lib/client'
import { getDestinationFromOnboardingResult } from '../../lib/onboarding/bootstrapDestination'
import { writeWebRouteHint } from '../../lib/onboarding/routeCache'
import { ensureAuthSession } from '../../lib/match/ensureSession'
import { createOnboardingApi } from '../../services/onboarding'

type GateState = 'loading' | 'ready' | 'needs-onboarding' | 'needs-email-auth'

/**
 * Restricts shell routes to users who have completed onboarding (Supabase `onboarding_completed_at`).
 * Ensures an auth session first so anonymous users can load preferences.
 */
export function RequireOnboardingComplete() {
  const location = useLocation()
  const [state, setState] = useState<GateState>('loading')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const auth = await ensureAuthSession()
      if (cancelled) return
      if (auth.needsEmailAuthFallback) {
        setState('needs-email-auth')
        return
      }
      const api = createOnboardingApi(createClient())
      const res = await api.getOnboardingState()
      if (cancelled) return
      if (!res.error) {
        writeWebRouteHint(res.data.isComplete)
      }
      const dest = getDestinationFromOnboardingResult(res)
      setState(dest === 'explore' ? 'ready' : 'needs-onboarding')
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (state === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    )
  }
  if (state === 'needs-email-auth') {
    const next = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate to={`/sign-up?reason=session&next=${next}`} replace />
  }
  if (state === 'needs-onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  return <Outlet />
}
