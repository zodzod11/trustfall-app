import { Link } from 'react-router-dom'
import type { ExploreCard as ExploreCardType } from '../../types'
import { cn } from '../../utils/cn'

type Props = {
  card: ExploreCardType
}

export function ExploreCard({ card }: Props) {
  return (
    <Link
      to={`/explore/${card.id}`}
      className="tf-card group block overflow-hidden transition-transform active:scale-[0.99]"
    >
      <div
        className={cn(
          'relative aspect-[16/10] bg-gradient-to-br',
          card.imageGradient,
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <span className="tf-tag absolute left-4 top-4 backdrop-blur-sm">
          {card.tag}
        </span>
      </div>
      <div className="space-y-1 px-4 py-4">
        <h2 className="text-lg font-semibold text-foreground group-hover:text-accent">
          {card.title}
        </h2>
        <p className="text-sm text-muted">{card.subtitle}</p>
      </div>
    </Link>
  )
}
