import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { createClient } from '../../lib/client'
import { getDestinationFromOnboardingResult } from '../../lib/onboarding/bootstrapDestination'
import { writeWebRouteHint } from '../../lib/onboarding/routeCache'
import { ensureAuthSession } from '../../lib/match/ensureSession'
import { createOnboardingApi } from '../../services/onboarding'

type Phase = 'loading' | 'explore' | 'onboarding' | 'signup' | 'verification-error'

/**
 * Resolves `/` (and catch-all) to Explore vs Onboarding from Supabase — avoids `/` → `/explore` → redirect flash.
 */
export function RootRoute() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [verificationError, setVerificationError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setPhase('loading')
      setVerificationError(null)
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
      if (dest === 'verification-error') {
        setVerificationError(res.error?.message ?? 'We could not verify your account right now.')
        setPhase('verification-error')
        return
      }
      setPhase(dest === 'explore' ? 'explore' : 'onboarding')
    })()
    return () => {
      cancelled = true
    }
  }, [reloadKey])

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
  if (phase === 'verification-error') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6">
        <div className="tf-card w-full max-w-md space-y-3 p-6 text-center">
          <p className="text-base font-semibold text-foreground">Couldn&apos;t verify your account</p>
          <p className="text-sm text-muted">
            {verificationError ?? 'Check your connection and try again.'}
          </p>
          <button
            type="button"
            onClick={() => setReloadKey((current) => current + 1)}
            className="tf-button-primary w-full"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }
  if (phase === 'onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  return <Navigate to="/explore" replace />
}
