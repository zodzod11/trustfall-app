import { Link } from 'react-router-dom'
import { usersSeed } from '../data/seed'
import { useSaved } from '../hooks/useSaved'

export function ProfilePage() {
  const user = usersSeed[0]
  const { savedPortfolioItemIds, savedProfessionalIds, requestSubmissions } = useSaved()
  const recentRequests = requestSubmissions.slice(0, 4)

  return (
    <div className="space-y-10">
      <header className="sticky top-0 z-20 -mx-4 border-b border-white/5 bg-background/80 px-4 pb-4 pt-1 backdrop-blur-xl sm:-mx-5 sm:px-5">
        <div className="grid grid-cols-[44px_1fr_44px] items-center">
          <Link
            to="/explore"
            aria-label="Trustfall home"
            className="group inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-surface-elevated"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/40 bg-primary/15 text-[11px] font-bold tracking-[0.14em] text-primary shadow-[0_8px_20px_-10px_rgba(47,99,230,0.8)]">
              TF
            </span>
          </Link>
          <div className="text-center">
            <h1 className="text-center text-[2rem] font-semibold tracking-tight text-primary">
              Profile
            </h1>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              Account
            </p>
          </div>
          <span aria-hidden className="h-10 w-10" />
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
