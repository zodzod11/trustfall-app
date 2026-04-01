import { Link } from 'react-router-dom'
import type { PortfolioItem, ServiceCategory } from '../../types'

export type PortfolioFeedItem = PortfolioItem & {
  professionalName: string
  professionalTitle: string
  location: string
  professionalPhone?: string
  professionalEmail?: string
  /** Populated when loaded from Supabase (Saved / detail use optional fields). */
  professionalRating?: number
  professionalReviewCount?: number
  professionalYearsExperience?: number
  professionalAbout?: string
}

type PortfolioCardProps = {
  item: PortfolioFeedItem
  view?: 'list' | 'grid'
}

const categoryLabel: Record<ServiceCategory, string> = {
  barber: 'Barber',
  hair: 'Hair',
  nails: 'Nails',
  makeup: 'Makeup',
}

export function PortfolioCard({ item, view = 'list' }: PortfolioCardProps) {
  if (view === 'grid') {
    return (
      <article className="group flex flex-col gap-3">
        <Link to={`/explore/${item.id}`} className="block">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[22px] border border-white/5 bg-surface shadow-[0_18px_45px_-20px_rgba(0,0,0,0.8)]">
            <img
              src={item.afterImageUrl}
              alt={`${item.serviceTitle} after result`}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              loading="lazy"
            />
            <div className="absolute left-3 top-3">
              <span className="rounded-full border border-white/10 bg-background/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-md">
                {categoryLabel[item.category]}
              </span>
            </div>
            <div className="absolute bottom-3 right-3">
              <span className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold tracking-[0.08em] text-primary-foreground shadow-[0_8px_24px_-8px_rgba(47,99,230,0.8)]">
                ${item.price}
              </span>
            </div>
          </div>
        </Link>
        <div className="space-y-1 px-0.5">
          <Link to={`/explore/${item.id}`} className="block">
            <p className="line-clamp-1 text-[1.05rem] font-semibold tracking-tight text-foreground">
              {item.serviceTitle}
            </p>
          </Link>
          <Link
            to={`/pros/${item.professionalId}`}
            className="line-clamp-1 text-xs font-medium text-muted transition hover:text-secondary"
          >
            {item.professionalName}
          </Link>
        </div>
      </article>
    )
  }

  return (
    <article className="tf-card overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-primary/40">
      <Link to={`/explore/${item.id}`} className="block">
        <div className="relative aspect-[4/5] w-full bg-surface-elevated">
          <img
            src={item.afterImageUrl}
            alt={`${item.serviceTitle} after result`}
            className="h-full w-full object-cover"
            loading="lazy"
          />

          <span className="tf-tag absolute left-3 top-3 border-border/80 bg-background/75 text-foreground backdrop-blur-sm">
            {categoryLabel[item.category]}
          </span>

          <div className="absolute bottom-3 right-3 w-20 overflow-hidden rounded-lg border border-border/80 shadow-soft">
            <img
              src={item.beforeImageUrl}
              alt={`${item.serviceTitle} before`}
              className="h-14 w-full object-cover"
              loading="lazy"
            />
            <p className="bg-background/90 px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted">
              Before
            </p>
          </div>
        </div>
      </Link>

      <div className="space-y-2.5 p-4">
        <div className="flex items-start justify-between gap-3">
          <Link to={`/explore/${item.id}`} className="min-w-0">
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-tight text-foreground sm:text-base">
              {item.serviceTitle}
            </h3>
          </Link>
          <p className="shrink-0 text-[15px] font-semibold text-accent sm:text-base">
            ${item.price}
          </p>
        </div>

        <div className="space-y-0.5 text-sm">
          <Link
            to={`/pros/${item.professionalId}`}
            className="inline-flex font-medium text-secondary transition hover:text-accent"
          >
            {item.professionalName}
          </Link>
          <p className="line-clamp-1 text-muted">
            {item.professionalTitle} · {item.location}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="tf-tag px-2.5 py-1 text-[10px] uppercase tracking-wide">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  )
}
