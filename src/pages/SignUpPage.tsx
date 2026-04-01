import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { TrustfallLogo } from '../components/brand/TrustfallLogo'
import { createClient } from '../lib/client'
import { cn } from '../utils/cn'

function reasonBanner(reason: string | null): string | null {
  if (reason === 'anonymous_disabled') {
    return 'Guest (anonymous) sign-in is off for this project. Create an account with email to continue onboarding.'
  }
  if (reason === 'session') {
    return 'Sign in or create an account to use the app.'
  }
  return null
}

export function SignUpPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const next = searchParams.get('next') || '/onboarding'
  const reason = searchParams.get('reason')
  const banner = reasonBanner(reason)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    const e = email.trim()
    if (!e || password.length < 8) {
      setError('Enter a valid email and a password of at least 8 characters.')
      return
    }
    setBusy(true)
    try {
      const supabase = createClient()
      const { error: signErr } = await supabase.auth.signUp({ email: e, password })
      if (signErr) {
        setError(signErr.message)
        return
      }
      navigate(next.startsWith('/') ? next : `/${next}`, { replace: true })
    } finally {
      setBusy(false)
    }
  }

  const nextSignIn = `/sign-in?next=${encodeURIComponent(next)}`

  return (
    <div className="relative flex min-h-dvh flex-col bg-background px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.2rem+env(safe-area-inset-top))]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-1/4 top-0 h-[420px] w-[420px] rounded-full bg-primary/25 blur-[100px]" />
      </div>
      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col gap-6">
        <TrustfallLogo size="page" className="shrink-0" />
        <div className="tf-card space-y-4 p-6">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Create account</h1>
          {banner ? (
            <p className="rounded-lg border border-border bg-surface/80 px-3 py-2 text-sm text-muted">
              {banner}
            </p>
          ) : null}
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="tf-input"
              placeholder="you@example.com"
              disabled={busy}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className="tf-input"
              placeholder="At least 8 characters"
              disabled={busy}
            />
          </label>
          {error ? (
            <p className="text-sm text-destructive/90" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className={cn('tf-button-primary w-full', busy && 'pointer-events-none opacity-70')}
          >
            {busy ? 'Creating account…' : 'Sign up'}
          </button>
          <p className="text-center text-sm text-muted">
            Already have an account?{' '}
            <Link to={nextSignIn} className="font-semibold text-primary underline-offset-2 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
