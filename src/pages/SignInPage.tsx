import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { TrustfallLogo } from '../components/brand/TrustfallLogo'
import { createClient } from '../lib/client'
import { cn } from '../utils/cn'

export function SignInPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const next = searchParams.get('next') || '/explore'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    const e = email.trim()
    if (!e || !password) {
      setError('Enter email and password.')
      return
    }
    setBusy(true)
    try {
      const supabase = createClient()
      const { error: signErr } = await supabase.auth.signInWithPassword({ email: e, password })
      if (signErr) {
        setError(signErr.message)
        return
      }
      navigate(next.startsWith('/') ? next : `/${next}`, { replace: true })
    } finally {
      setBusy(false)
    }
  }

  const nextSignUp = `/sign-up?next=${encodeURIComponent(next)}`

  return (
    <div className="relative flex min-h-dvh flex-col bg-background px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.2rem+env(safe-area-inset-top))]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -right-1/4 bottom-0 h-[380px] w-[380px] rounded-full bg-accent/16 blur-[90px]" />
      </div>
      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col gap-6">
        <TrustfallLogo size="page" className="shrink-0" />
        <div className="tf-card space-y-4 p-6">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Sign in</h1>
          <p className="text-sm text-muted">
            Returning user? Sign in here. New here?{' '}
            <Link to={nextSignUp} className="font-semibold text-primary underline-offset-2 hover:underline">
              Create an account
            </Link>
            .
          </p>
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
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className="tf-input"
              placeholder="••••••••"
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
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
