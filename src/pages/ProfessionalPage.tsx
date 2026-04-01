import { Link, useParams } from 'react-router-dom'
import { TrustfallLogo } from '../components/brand/TrustfallLogo'
import { PortfolioCard } from '../components/explore/PortfolioCard'
import { PageHeader } from '../components/layout/PageHeader'
import { useProfessionalPortfolio } from '../hooks/useProfessionalPortfolio'

export function ProfessionalPage() {
  const { id } = useParams()
  const { items, loading, error } = useProfessionalPortfolio(id)

  if (loading) {
    return (
      <div className="space-y-6">
        <Link
          to="/explore"
          className="inline-flex items-center gap-3 text-sm font-medium text-muted transition hover:text-accent"
        >
          <TrustfallLogo size="header" className="h-7 max-h-7 max-w-[100px] opacity-90" />
          <span className="inline-flex items-center gap-2">
            <span aria-hidden>←</span> Back to Explore
          </span>
        </Link>
        <p className="text-sm text-muted">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link
          to="/explore"
          className="inline-flex items-center gap-3 text-sm font-medium text-muted transition hover:text-accent"
        >
          <TrustfallLogo size="header" className="h-7 max-h-7 max-w-[100px] opacity-90" />
          <span className="inline-flex items-center gap-2">
            <span aria-hidden>←</span> Back to Explore
          </span>
        </Link>
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      </div>
    )
  }

  const professional = id
    ? {
        id,
        displayName: items[0]?.professionalName ?? '',
        title: items[0]?.professionalTitle ?? '',
        category: items[0]?.category ?? 'hair',
        city: items[0]?.location ?? '',
        rating: items[0]?.professionalRating ?? 0,
        reviewCount: items[0]?.professionalReviewCount ?? 0,
        yearsExperience: items[0]?.professionalYearsExperience ?? 0,
        about: items[0]?.professionalAbout ?? '',
        bookingPhone: items[0]?.professionalPhone,
        bookingEmail: items[0]?.professionalEmail,
        portfolioItems: items.map((item) => ({
          id: item.id,
          professionalId: item.professionalId,
          beforeImageUrl: item.beforeImageUrl,
          afterImageUrl: item.afterImageUrl,
          price: item.price,
          serviceTitle: item.serviceTitle,
          tags: item.tags,
          category: item.category,
        })),
      }
    : null

  if (!professional || items.length === 0) {
    return (
      <div className="space-y-6">
        <Link
          to="/explore"
          className="inline-flex items-center gap-3 text-sm font-medium text-muted transition hover:text-accent"
        >
          <TrustfallLogo size="header" className="h-7 max-h-7 max-w-[100px] opacity-90" />
          <span className="inline-flex items-center gap-2">
            <span aria-hidden>←</span> Back to Explore
          </span>
        </Link>
        <div className="tf-card space-y-3 px-5 py-7 text-center">
          <p className="text-base font-semibold text-secondary">Professional not found.</p>
          <p className="text-sm text-muted">
            The profile may have moved, or this link is no longer available.
          </p>
          <Link to="/explore" className="tf-button-secondary mt-2 w-full">
            Return to Explore
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-7">
      <Link
        to="/explore"
        className="inline-flex items-center gap-3 text-sm font-medium text-muted transition hover:text-accent"
      >
        <TrustfallLogo size="header" className="h-7 max-h-7 max-w-[100px] opacity-90" />
        <span className="inline-flex items-center gap-2">
          <span aria-hidden>←</span> Back to Explore
        </span>
      </Link>

      <PageHeader
        eyebrow={professional.category}
        title={professional.displayName}
        description={`${professional.title} · ${professional.city}`}
      />

      <section className="tf-card space-y-3 p-4">
        <p className="text-sm leading-relaxed text-muted">{professional.about}</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border bg-background px-3 py-3 text-center">
            <p className="text-base font-semibold text-foreground">
              {professional.rating.toFixed(1)}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-muted">Rating</p>
          </div>
          <div className="rounded-xl border border-border bg-background px-3 py-3 text-center">
            <p className="text-base font-semibold text-foreground">
              {professional.reviewCount}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-muted">Reviews</p>
          </div>
          <div className="rounded-xl border border-border bg-background px-3 py-3 text-center">
            <p className="text-base font-semibold text-foreground">
              {professional.yearsExperience}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-muted">Years</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          All Work
        </h2>
        <div className="grid grid-cols-1 gap-4">
          {items.map((item) => (
            <PortfolioCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  )
}
