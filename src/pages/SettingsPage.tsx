import { Link, useNavigate } from 'react-router-dom'
import { TrustfallLogo } from '../components/brand/TrustfallLogo'
import { createClient } from '../lib/client'
import { cn } from '../utils/cn'

export function SettingsPage() {
  const navigate = useNavigate()

  async function handleSignOut() {
    const { error } = await createClient().auth.signOut()
    if (error) {
      console.error(error.message)
      return
    }
    navigate('/sign-in', { replace: true })
  }

  return (
    <div className="space-y-8">
      <header className="sticky top-0 z-20 -mx-4 border-b border-white/5 bg-background/80 px-4 pb-4 pt-1 backdrop-blur-xl sm:-mx-5 sm:px-5">
        <div className="grid grid-cols-[auto_1fr] items-center gap-3">
          <Link
            to="/profile"
            className="inline-flex min-h-10 min-w-0 items-center rounded-lg px-2 text-sm font-semibold text-primary hover:underline"
          >
            ← Profile
          </Link>
          <div className="text-center">
            <h1 className="text-center text-[1.35rem] font-semibold tracking-tight text-primary">
              Settings
            </h1>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              Account
            </p>
          </div>
        </div>
      </header>

      <section className="tf-card space-y-4 p-5">
        <p className="text-sm text-muted">
          Manage your Trustfall session. More preferences will appear here as the product grows.
        </p>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className={cn(
            'w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground',
            'transition hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive',
          )}
        >
          Sign out
        </button>
      </section>

      <div className="flex justify-center pb-8">
        <Link to="/explore" aria-label="Trustfall home" className="opacity-80 transition hover:opacity-100">
          <TrustfallLogo size="header" />
        </Link>
      </div>
    </div>
  )
}
