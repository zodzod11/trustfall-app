import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { TrustfallLogo } from '../components/brand/TrustfallLogo'
import { BeforeAfterDisplay } from '../components/explore/BeforeAfterDisplay'
import {
  PortfolioCard,
  type PortfolioFeedItem,
} from '../components/explore/PortfolioCard'
import {
  DEFAULT_REQUEST_MESSAGE,
  RequestModal,
} from '../components/explore/RequestModal'
import { PageHeader } from '../components/layout/PageHeader'
import { useExplorePortfolioDetail } from '../hooks/useExplorePortfolioDetail'
import { useSaved } from '../hooks/useSaved'

type PortfolioDetailItem = PortfolioFeedItem & {
  professionalRating: number
  professionalReviewCount: number
  professionalYearsExperience: number
  professionalAbout: string
}

export function ExploreDetailPage() {
  const { id } = useParams()
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [requestMessagePrefill, setRequestMessagePrefill] =
    useState(DEFAULT_REQUEST_MESSAGE)
  const {
    requestSubmissions,
    addRequestSubmission,
    isPortfolioItemSaved,
    isProfessionalSaved,
    togglePortfolioItem,
    toggleProfessional,
  } = useSaved()
  const { item: rawItem, moreFromSamePro, loading, error } = useExplorePortfolioDetail(id)

  const selectedItem = useMemo((): PortfolioDetailItem | null => {
    if (!rawItem) return null
    return {
      ...rawItem,
      professionalRating: rawItem.professionalRating ?? 0,
      professionalReviewCount: rawItem.professionalReviewCount ?? 0,
      professionalYearsExperience: rawItem.professionalYearsExperience ?? 0,
      professionalAbout: rawItem.professionalAbout ?? '',
    }
  }, [rawItem])

  return (
    <div className="space-y-8">
      <Link
        to="/explore"
        className="inline-flex items-center gap-3 text-sm font-medium text-muted transition hover:text-accent"
      >
        <TrustfallLogo size="header" className="h-7 max-h-7 max-w-[100px] opacity-90" />
        <span className="inline-flex items-center gap-2">
          <span aria-hidden>←</span> Back to Explore
        </span>
      </Link>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {!loading && !error && !selectedItem ? (
        <div className="tf-card space-y-3 px-5 py-6 text-center">
          <p className="text-sm font-medium text-secondary">
            Portfolio item not found.
          </p>
          <p className="text-xs text-muted">Try selecting another look from Explore.</p>
          <Link to="/explore" className="tf-button-secondary mt-2 w-full">
            Return to Explore
          </Link>
        </div>
      ) : null}

      {selectedItem ? (
        <>
          <BeforeAfterDisplay
            beforeImageUrl={selectedItem.beforeImageUrl}
            afterImageUrl={selectedItem.afterImageUrl}
            serviceTitle={selectedItem.serviceTitle}
          />

          <PageHeader
            eyebrow={selectedItem.category}
            title={selectedItem.serviceTitle}
            description={`${selectedItem.professionalName} · ${selectedItem.location}`}
          />

          <section className="tf-card space-y-4 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Price
                </p>
                <p className="text-2xl font-semibold text-foreground">
                  ${selectedItem.price}
                </p>
              </div>
              <div className="text-right text-xs text-muted">
                <p>{selectedItem.professionalRating.toFixed(1)} average rating</p>
                <p>{selectedItem.professionalReviewCount} reviews</p>
                <p>{selectedItem.professionalYearsExperience} years experience</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Pro Info
              </p>
              <p className="text-sm font-medium text-secondary">
                <Link
                  to={`/pros/${selectedItem.professionalId}`}
                  className="transition hover:text-accent"
                >
                  {selectedItem.professionalName}
                </Link>{' '}
                · {selectedItem.professionalTitle}
              </p>
              <p className="text-sm leading-relaxed text-muted">
                {selectedItem.professionalAbout}
              </p>
              <button
                type="button"
                onClick={() => toggleProfessional(selectedItem.professionalId)}
                className="tf-button-secondary w-full text-sm"
              >
                {isProfessionalSaved(selectedItem.professionalId)
                  ? 'Saved Pro'
                  : 'Save Pro'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedItem.tags.map((tag) => (
                <span
                  key={tag}
                  className="tf-tag px-2.5 py-1 text-[10px] uppercase tracking-wide"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setRequestMessagePrefill(DEFAULT_REQUEST_MESSAGE)
                  setIsRequestModalOpen(true)
                }}
                className="tf-button-primary col-span-2 w-full"
              >
                Send Request
              </button>
              <button
                type="button"
                onClick={() => {
                  togglePortfolioItem(selectedItem.id)
                  setRequestMessagePrefill(
                    `${DEFAULT_REQUEST_MESSAGE} I would like this look: ${selectedItem.serviceTitle}.`,
                  )
                  setIsRequestModalOpen(true)
                }}
                className="tf-button-secondary w-full"
              >
                {isPortfolioItemSaved(selectedItem.id)
                  ? 'Saved to Collection'
                  : 'Use This Look'}
              </button>
              <a
                href={`tel:${selectedItem.professionalPhone ?? '+17135551234'}`}
                className="tf-button-secondary w-full text-center"
              >
                Call
              </a>
              <a
                href={`sms:${selectedItem.professionalPhone ?? '+17135551234'}`}
                className="tf-button-secondary w-full text-center"
              >
                Text
              </a>
            </div>
            {requestSubmissions.length > 0 ? (
              <p className="text-center text-xs text-muted">
                {requestSubmissions.length} request
                {requestSubmissions.length > 1 ? 's' : ''} stored in local state.
              </p>
            ) : null}
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">
              More Work From{' '}
              <Link
                to={`/pros/${selectedItem.professionalId}`}
                className="text-secondary transition hover:text-accent"
              >
                {selectedItem.professionalName}
              </Link>
            </h2>
            {moreFromSamePro.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {moreFromSamePro.map((item) => (
                  <PortfolioCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="tf-card px-4 py-5 text-sm text-muted">
                More looks from this professional are coming soon.
              </div>
            )}
          </section>
        </>
      ) : null}

      {selectedItem && isRequestModalOpen ? (
        <RequestModal
          onClose={() => setIsRequestModalOpen(false)}
          portfolioItemId={selectedItem.id}
          portfolioImageUrl={selectedItem.afterImageUrl}
          serviceTitle={selectedItem.serviceTitle}
          proName={selectedItem.professionalName}
          phoneNumber={selectedItem.professionalPhone ?? '+17135551234'}
          proEmail={selectedItem.professionalEmail}
          initialMessage={requestMessagePrefill}
          onSubmit={addRequestSubmission}
        />
      ) : null}
    </div>
  )
}
