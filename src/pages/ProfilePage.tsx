import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TrustfallLogo } from '../components/brand/TrustfallLogo'
import { createClient } from '../lib/client'
import { usersSeed } from '../data/seed'
import { useSaved } from '../hooks/useSaved'
import { cn } from '../utils/cn'

export function ProfilePage() {
  const navigate = useNavigate()
  const user = usersSeed[0]
  const { savedPortfolioItemIds, savedProfessionalIds, requestSubmissions } = useSaved()
  const recentRequests = requestSubmissions.slice(0, 4)

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  async function handleSignOut() {
    setMenuOpen(false)
    const { error } = await createClient().auth.signOut()
    if (error) {
      console.error(error.message)
      return
    }
    navigate('/sign-in', { replace: true })
  }

  return (
    <div className="space-y-10">
      <header className="sticky top-0 z-30 -mx-4 overflow-visible border-b border-white/5 bg-background/80 px-4 pb-4 pt-1 backdrop-blur-xl sm:-mx-5 sm:px-5">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-1">
          <Link
            to="/explore"
            aria-label="Trustfall home"
            className="group inline-flex min-h-10 min-w-0 max-w-[min(120px,28vw)] items-center justify-start rounded-lg px-0.5 transition hover:bg-surface-elevated/80"
          >
            <TrustfallLogo size="header" className="max-h-8" />
          </Link>
          <div className="text-center">
            <h1 className="text-center text-[2rem] font-semibold tracking-tight text-primary">
              Profile
            </h1>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              Account
            </p>
          </div>
          <div ref={menuRef} className="relative flex min-h-10 min-w-[44px] items-center justify-end">
            <button
              type="button"
              className={cn(
                'inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted transition',
                'hover:bg-surface-elevated/80 hover:text-foreground',
                menuOpen && 'bg-surface-elevated/80 text-foreground',
              )}
              aria-label="Account menu"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-6 w-6"
                aria-hidden
              >
                <circle cx="12" cy="6" r="1.75" />
                <circle cx="12" cy="12" r="1.75" />
                <circle cx="12" cy="18" r="1.75" />
              </svg>
            </button>
            {menuOpen ? (
              <div
                className="absolute right-0 top-full z-[100] mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-border bg-background py-1 shadow-lg"
                role="menu"
              >
                <Link
                  to="/settings"
                  role="menuitem"
                  className="block px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface-elevated/80"
                  onClick={() => setMenuOpen(false)}
                >
                  Settings
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-4 py-2.5 text-left text-sm font-medium text-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => void handleSignOut()}
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-lg font-semibold text-primary-foreground">
          {user.firstName[0]}
          {user.lastName[0]}
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-sm text-muted">{user.email}</p>
          <p className="text-xs text-muted">{user.city}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {[
          {
            label: 'Saved Looks',
            value: savedPortfolioItemIds.length.toString(),
          },
          {
            label: 'Saved Pros',
            value: savedProfessionalIds.length.toString(),
          },
          {
            label: 'Requests',
            value: requestSubmissions.length.toString(),
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="tf-card px-3 py-4 text-center"
          >
            <p className="text-xl font-semibold text-foreground">{stat.value}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted/80">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          Preferences
        </h2>
        <div className="tf-card space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            {user.preferredCategories.map((category) => (
              <span
                key={category}
                className="tf-tag px-2.5 py-1 text-[10px] uppercase tracking-wide"
              >
                {category}
              </span>
            ))}
          </div>
          <p className="text-sm text-secondary">
            Budget range: ${user.budgetMin} - ${user.budgetMax}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          Recent Requests
        </h2>
        {recentRequests.length > 0 ? (
          <ul className="space-y-2.5">
            {recentRequests.map((request) => (
              <li
                key={request.createdAt + request.portfolioItemId}
                className="tf-card flex gap-3 overflow-hidden p-4"
              >
                {request.portfolioImageUrl ? (
                  <div className="h-16 w-14 shrink-0 overflow-hidden rounded-lg border border-border">
                    <img
                      src={request.portfolioImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-secondary">{request.proName}</p>
                  {(request.clientName || request.clientEmail) ? (
                    <p className="mt-0.5 text-[11px] text-muted">
                      {[request.clientName, request.clientEmail].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted line-clamp-2">{request.message}</p>
                  <p className="mt-2 text-[11px] text-muted">
                    {request.preferredDate
                      ? `Preferred date: ${request.preferredDate}`
                      : 'No preferred date'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="tf-card p-4 text-sm text-muted">
            No requests yet. Send one from a look detail or match result.
          </div>
        )}
      </section>
    </div>
  )
}
