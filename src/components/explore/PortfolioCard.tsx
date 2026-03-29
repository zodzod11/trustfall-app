import { Link } from 'react-router-dom'
import type { PortfolioItem, ServiceCategory } from '../../types'

export type PortfolioFeedItem = PortfolioItem & {
  professionalName: string
  professionalTitle: string
  location: string
}

type PortfolioCardProps = {
  item: PortfolioFeedItem
}

const categoryLabel: Record<ServiceCategory, string> = {
  barber: 'Barber',
  hair: 'Hair',
  nails: 'Nails',
  makeup: 'Makeup',
}

export function PortfolioCard({ item }: PortfolioCardProps) {
  return (
    <Link
      to={`/explore/${item.id}`}
      className="tf-card block overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-primary/40"
    >
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

      <div className="space-y-2.5 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-tight text-foreground sm:text-base">
            {item.serviceTitle}
          </h3>
          <p className="shrink-0 text-[15px] font-semibold text-accent sm:text-base">
            ${item.price}
          </p>
        </div>

        <div className="space-y-0.5 text-sm">
          <p className="font-medium text-secondary">{item.professionalName}</p>
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
    </Link>
  )
}
