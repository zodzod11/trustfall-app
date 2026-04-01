import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { createClient } from '../../lib/client'
import { getDestinationFromOnboardingResult } from '../../lib/onboarding/bootstrapDestination'
import { writeWebRouteHint } from '../../lib/onboarding/routeCache'
import { ensureAuthSession } from '../../lib/match/ensureSession'
import { createOnboardingApi } from '../../services/onboarding'

type Phase = 'loading' | 'explore' | 'onboarding' | 'signup'

/**
 * Resolves `/` (and catch-all) to Explore vs Onboarding from Supabase — avoids `/` → `/explore` → redirect flash.
 */
export function RootRoute() {
  const [phase, setPhase] = useState<Phase>('loading')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const auth = await ensureAuthSession()
      if (cancelled) return
      if (auth.needsEmailAuthFallback) {
        setPhase('signup')
        return
      }
      const api = createOnboardingApi(createClient())
      const res = await api.getOnboardingState()
      if (cancelled) return
      if (!res.error) {
        writeWebRouteHint(res.data.isComplete)
      }
      const dest = getDestinationFromOnboardingResult(res)
      setPhase(dest === 'explore' ? 'explore' : 'onboarding')
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (phase === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    )
  }
  if (phase === 'signup') {
    return (
      <Navigate
        to="/sign-up?reason=anonymous_disabled&next=%2Fonboarding"
        replace
      />
    )
  }
  if (phase === 'onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  return <Navigate to="/explore" replace />
}
