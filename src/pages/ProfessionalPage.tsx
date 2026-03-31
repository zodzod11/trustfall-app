import { Link, useParams } from 'react-router-dom'
import { PortfolioCard, type PortfolioFeedItem } from '../components/explore/PortfolioCard'
import { PageHeader } from '../components/layout/PageHeader'
import { professionalsSeed } from '../data/seed'

export function ProfessionalPage() {
  const { id } = useParams()
  const professional = professionalsSeed.find((pro) => pro.id === id)

  if (!professional) {
    return (
      <div className="space-y-6">
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-accent"
        >
          <span aria-hidden>←</span> Back to Explore
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

  const portfolioItems: PortfolioFeedItem[] = professional.portfolioItems.map((item) => ({
    ...item,
    professionalName: professional.displayName,
    professionalTitle: professional.title,
    location: professional.city,
    professionalPhone: professional.bookingPhone,
    professionalEmail: professional.bookingEmail,
  }))

  return (
    <div className="space-y-7">
      <Link
        to="/explore"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-accent"
      >
        <span aria-hidden>←</span> Back to Explore
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
          {portfolioItems.map((item) => (
            <PortfolioCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  )
}
