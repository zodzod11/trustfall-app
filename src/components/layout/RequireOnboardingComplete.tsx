import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { createClient } from '../../lib/client'
import { getDestinationFromOnboardingResult } from '../../lib/onboarding/bootstrapDestination'
import { writeWebRouteHint } from '../../lib/onboarding/routeCache'
import { ensureAuthSession } from '../../lib/match/ensureSession'
import { createOnboardingApi } from '../../services/onboarding'

type GateState = 'loading' | 'ready' | 'needs-onboarding' | 'needs-email-auth' | 'verification-error'

/**
 * Restricts shell routes to users who have completed onboarding (Supabase `onboarding_completed_at`).
 * Ensures an auth session first so anonymous users can load preferences.
 */
export function RequireOnboardingComplete() {
  const location = useLocation()
  const [state, setState] = useState<GateState>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [verificationError, setVerificationError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setState('loading')
      setVerificationError(null)
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
      if (dest === 'verification-error') {
        setVerificationError(res.error?.message ?? 'We could not verify your account right now.')
        setState('verification-error')
        return
      }
      setState(dest === 'explore' ? 'ready' : 'needs-onboarding')
    })()
    return () => {
      cancelled = true
    }
  }, [reloadKey])

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
  if (state === 'verification-error') {
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
  if (state === 'needs-onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  return <Outlet />
}
