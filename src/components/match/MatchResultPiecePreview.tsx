import { Link } from 'react-router-dom'
import type { MatchResultsRankedProfessional } from '../../types'
import { findPortfolioItemById } from '../../utils/portfolioLookup'
import { BeforeAfterDisplay } from '../explore/BeforeAfterDisplay'

type MatchResultPiecePreviewProps = {
  ranked: MatchResultsRankedProfessional
  portfolioItemId: string
  onClose: () => void
  onRequest: () => void
}

export function MatchResultPiecePreview({
  ranked,
  portfolioItemId,
  onClose,
  onRequest,
}: MatchResultPiecePreviewProps) {
  const resolved = findPortfolioItemById(portfolioItemId)

  if (!resolved) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-background">
        <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-muted transition hover:text-accent"
          >
            ← Back to matches
          </button>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm font-medium text-secondary">Could not load this look.</p>
          <button type="button" onClick={onClose} className="tf-button-primary">
            Back to matches
          </button>
        </div>
      </div>
    )
  }

  const { item, professional } = resolved
  const piece =
    ranked.matchedPieces.find((p) => p.id === portfolioItemId) ?? ranked.matchedPieces[0]

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b border-white/5 bg-background/90 px-4 py-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-medium text-muted transition hover:text-accent"
        >
          ← Back to matches
        </button>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          Match · Review look
        </p>
        <span className="w-16" aria-hidden />
      </header>

      <div className="tf-no-scrollbar flex-1 overflow-y-auto px-4 pb-28 pt-4 sm:px-5">
        <BeforeAfterDisplay
          beforeImageUrl={item.beforeImageUrl}
          afterImageUrl={item.afterImageUrl}
          serviceTitle={item.serviceTitle}
        />

        <div className="mt-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {item.category}
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {item.serviceTitle}
          </h1>
          <p className="text-sm text-secondary">
            <Link
              to={`/pros/${professional.id}`}
              className="font-medium transition hover:text-accent"
            >
              {professional.displayName}
            </Link>
            {' · '}
            {professional.city}
          </p>
          {piece ? (
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">
              {piece.scoreLabel}
            </p>
          ) : null}
        </div>

        <div className="mt-5 tf-card space-y-4 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Price
              </p>
              <p className="text-2xl font-semibold text-foreground">${item.price}</p>
            </div>
            <div className="text-right text-xs text-muted">
              <p>{professional.rating.toFixed(1)} average rating</p>
              <p>{professional.reviewCount} reviews</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="tf-tag px-2.5 py-1 text-[10px] uppercase tracking-wide"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-white/5 bg-background/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <div className="mx-auto grid max-w-lg grid-cols-3 gap-2">
          <button type="button" onClick={onRequest} className="tf-button-primary px-2 py-2.5 text-xs">
            Request
          </button>
          <a
            href={`tel:${ranked.phoneNumber}`}
            className="tf-button-secondary px-2 py-2.5 text-center text-xs"
          >
            Call
          </a>
          <a
            href={`sms:${ranked.phoneNumber}`}
            className="tf-button-secondary px-2 py-2.5 text-center text-xs"
          >
            Text
          </a>
        </div>
      </div>
    </div>
  )
}
