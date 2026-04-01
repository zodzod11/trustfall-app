import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { TrustfallLogo } from '../components/brand/TrustfallLogo'
import { RequestModal } from '../components/explore/RequestModal'
import { MatchResultPiecePreview } from '../components/match/MatchResultPiecePreview'
import { PageHeader } from '../components/layout/PageHeader'
import { professionalsSeed } from '../data/seed'
import { useMatchRunResults } from '../hooks/useMatchRunResults'
import { useSaved } from '../hooks/useSaved'
import type { MatchRequestDraft, MatchResultsRankedProfessional } from '../types'
import { cn } from '../utils/cn'
import { buildMatchRequestPrefillMessage } from '../utils/matchRequestPrefill'
import {
  clearMatchUploadSession,
  readMatchUploadFilesFromSession,
} from '../utils/matchUploadSession'

type MatchResultsState = {
  request?: MatchRequestDraft
  matchRequestId?: string
}

export function MatchResultsPage() {
  const location = useLocation()
  const state = (location.state as MatchResultsState | null) ?? null
  const request = state?.request
  const matchRequestId = state?.matchRequestId
  const {
    ranked: serverRanked,
    status: matchRunStatus,
    isPending: hookPending,
    errorMessage: matchRunError,
  } = useMatchRunResults(matchRequestId)
  const [demoPending, setDemoPending] = useState(() => !matchRequestId)
  const [activeRequestTarget, setActiveRequestTarget] =
    useState<MatchResultsRankedProfessional | null>(null)
  const [piecePreview, setPiecePreview] = useState<{
    ranked: MatchResultsRankedProfessional
    portfolioItemId: string
  } | null>(null)
  const [requestUploadPrefill, setRequestUploadPrefill] = useState<{
    inspiration: File | null
    current: File | null
  }>({ inspiration: null, current: null })
  const [selectedPieceByProId, setSelectedPieceByProId] = useState<
    Record<string, string>
  >({})
  const { requestSubmissions, addRequestSubmission } = useSaved()

  useEffect(() => {
    if (matchRequestId) return
    const timer = window.setTimeout(() => {
      setDemoPending(false)
    }, 1400)
    return () => window.clearTimeout(timer)
  }, [matchRequestId])

  const ranked: MatchResultsRankedProfessional[] = useMemo(() => {
    if (matchRequestId) {
      if (matchRunStatus === 'ready') return serverRanked
      return []
    }
    return rankProfessionals(request)
  }, [matchRequestId, matchRunStatus, serverRanked, request])

  const isPending = matchRequestId ? hookPending : demoPending

  return (
    <div className="space-y-8">
      <div className="-mb-2 flex justify-center sm:justify-start">
        <Link
          to="/explore"
          aria-label="Trustfall home"
          className="inline-flex rounded-lg px-1 py-0.5 transition hover:bg-surface-elevated/80"
        >
          <TrustfallLogo size="header" className="max-h-8" />
        </Link>
      </div>
      <PageHeader
        eyebrow="Matches"
        title={isPending ? 'Finding your matches...' : 'Results'}
        description={
          isPending
            ? 'Comparing style tags, category, and location to rank the best fits.'
            : request
              ? 'Ranked from your submitted request details.'
              : 'No submitted request found. Showing sample ranked results.'
        }
      />

      {matchRunError && !isPending ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {matchRunError}
        </p>
      ) : null}

      {isPending ? (
        <>
          <section className="tf-card space-y-2 p-4">
            <p className="text-sm font-medium text-secondary">
              We are curating a shortlist of pros for your request.
            </p>
            <p className="text-xs text-muted">
              Matching on category, nearby availability, and style tags...
            </p>
          </section>

          <ol className="space-y-4">
            {[1, 2, 3, 4].map((index) => (
              <li key={index} className="tf-card animate-pulse overflow-hidden">
                <div className="grid grid-cols-[110px_1fr] gap-4 p-4">
                  <div className="h-[120px] rounded-xl bg-surface-elevated" />
                  <div className="space-y-3">
                    <div className="h-4 w-2/3 rounded bg-surface-elevated" />
                    <div className="h-3 w-1/2 rounded bg-surface-elevated" />
                    <div className="h-3 w-4/5 rounded bg-surface-elevated" />
                    <div className="flex gap-2 pt-1">
                      <div className="h-6 w-20 rounded-full bg-surface-elevated" />
                      <div className="h-6 w-24 rounded-full bg-surface-elevated" />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </>
      ) : null}

      {!isPending && request ? (
        <section className="tf-card space-y-2 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Request Summary
          </p>
          <p className="text-sm text-secondary">
            {request.category || 'Any'} · {request.location || 'Any location'}
          </p>
          {request.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {request.tags.map((tag) => (
                <span
                  key={tag}
                  className="tf-tag px-2.5 py-1 text-[10px] uppercase tracking-wide"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          {request.imageName ? (
            <p className="text-xs text-muted">Inspiration: {request.imageName}</p>
          ) : null}
        </section>
      ) : null}

      {!isPending && ranked.length > 0 ? (
        <ol className="space-y-4">
          {ranked.map((item, i) => {
            const selectedPieceId = selectedPieceByProId[item.id]
            const selectedPiece =
              item.matchedPieces.find((piece) => piece.id === selectedPieceId) ??
              item.matchedPieces[0]
            const portfolioImageUrl = selectedPiece?.imageUrl ?? item.portfolioImageUrl
            const selectedServiceTitle = selectedPiece?.serviceTitle ?? item.serviceTitle
            const selectedPortfolioItemId =
              selectedPiece?.id ?? item.portfolioItemId
            const selectedScoreLabel = selectedPiece?.scoreLabel ?? item.scoreLabel

            return (
            <li key={item.id} className="tf-card overflow-hidden">
              <div className="grid grid-cols-[112px_1fr] gap-4 p-4">
                <button
                  type="button"
                  onClick={() =>
                    setPiecePreview({
                      ranked: item,
                      portfolioItemId: selectedPortfolioItemId,
                    })
                  }
                  className="relative block h-[128px] w-full overflow-hidden rounded-xl bg-surface-elevated text-left ring-offset-background transition hover:ring-2 hover:ring-primary/40"
                  aria-label={`Review portfolio piece: ${selectedServiceTitle}`}
                >
                  <img
                    src={portfolioImageUrl}
                    alt={`${item.name} portfolio result`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/85 text-xs font-semibold text-accent">
                    {i + 1}
                  </div>
                </button>
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-base font-semibold text-foreground">
                      <Link to={`/pros/${item.id}`} className="transition hover:text-accent">
                        {item.name}
                      </Link>
                    </h2>
                    <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                      {selectedScoreLabel}
                    </span>
                  </div>
                  <p className="text-sm text-secondary">
                    {item.title} · {item.city}
                  </p>
                  <p className="line-clamp-1 text-xs text-muted">
                    Best matching look: {selectedServiceTitle}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setPiecePreview({
                        ranked: item,
                        portfolioItemId: selectedPortfolioItemId,
                      })
                    }
                    className="inline-flex text-[11px] font-semibold text-accent transition hover:text-foreground"
                  >
                    Review this look
                  </button>
                  <p className="text-xs text-muted">{item.rating.toFixed(1)} rating</p>
                  <div className="flex flex-wrap gap-2">
                    {item.labels.map((label) => (
                      <span
                        key={label}
                        className="tf-tag px-2.5 py-1 text-[10px] uppercase tracking-wide"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                  {item.matchedPieces.length > 1 ? (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {item.matchedPieces.map((piece) => {
                        const isActive = piece.id === selectedPortfolioItemId
                        return (
                          <button
                            key={piece.id}
                            type="button"
                            onClick={() =>
                              setSelectedPieceByProId((current) => ({
                                ...current,
                                [item.id]: piece.id,
                              }))
                            }
                            className={cn(
                              'relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border transition',
                              isActive
                                ? 'border-primary ring-2 ring-primary/35'
                                : 'border-border',
                            )}
                            aria-label={`Preview ${piece.serviceTitle}`}
                          >
                            <img
                              src={piece.imageUrl}
                              alt={piece.serviceTitle}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const files = readMatchUploadFilesFromSession()
                        clearMatchUploadSession()
                        setRequestUploadPrefill(files)
                        setActiveRequestTarget({
                          ...item,
                          portfolioItemId: selectedPortfolioItemId,
                          portfolioImageUrl,
                          serviceTitle: selectedServiceTitle,
                          scoreLabel: selectedScoreLabel,
                        })
                      }}
                      className="tf-button-primary col-span-1 w-full px-2 py-2 text-xs"
                    >
                      Request
                    </button>
                    <a
                      href={`tel:${item.phoneNumber}`}
                      className="tf-button-secondary col-span-1 w-full px-2 py-2 text-center text-xs"
                    >
                      Call
                    </a>
                    <a
                      href={`sms:${item.phoneNumber}`}
                      className="tf-button-secondary col-span-1 w-full px-2 py-2 text-center text-xs"
                    >
                      Text
                    </a>
                  </div>
                </div>
              </div>
            </li>
            )
          })}
        </ol>
      ) : null}

      {!isPending && ranked.length === 0 ? (
        <div className="tf-card space-y-2 p-5 text-center">
          <p className="text-sm font-semibold text-secondary">No matches yet</p>
          <p className="text-xs text-muted">
            Try widening your location or reducing style filters.
          </p>
          <Link to="/match" className="tf-button-secondary mt-2 w-full">
            Update Request
          </Link>
        </div>
      ) : null}

      {!isPending && requestSubmissions.length > 0 ? (
        <p className="text-center text-xs text-muted">
          {requestSubmissions.length} request
          {requestSubmissions.length > 1 ? 's' : ''} stored in local state.
        </p>
      ) : null}

      {!isPending ? (
        <Link
          to="/match"
          className="block text-center text-sm font-medium text-muted hover:text-accent"
        >
          ← Adjust preferences
        </Link>
      ) : null}

      {piecePreview ? (
        <MatchResultPiecePreview
          ranked={piecePreview.ranked}
          portfolioItemId={piecePreview.portfolioItemId}
          onClose={() => setPiecePreview(null)}
          onRequest={() => {
            const files = readMatchUploadFilesFromSession()
            clearMatchUploadSession()
            setRequestUploadPrefill(files)
            const r = piecePreview.ranked
            const pid = piecePreview.portfolioItemId
            const selectedPiece =
              r.matchedPieces.find((p) => p.id === pid) ?? r.matchedPieces[0]
            setActiveRequestTarget({
              ...r,
              portfolioItemId: selectedPiece.id,
              portfolioImageUrl: selectedPiece.imageUrl,
              serviceTitle: selectedPiece.serviceTitle,
              scoreLabel: selectedPiece.scoreLabel,
            })
            setPiecePreview(null)
          }}
        />
      ) : null}

      {activeRequestTarget ? (
        <RequestModal
          key={activeRequestTarget.portfolioItemId}
          onClose={() => {
            setActiveRequestTarget(null)
            setRequestUploadPrefill({ inspiration: null, current: null })
          }}
          portfolioItemId={activeRequestTarget.portfolioItemId}
          portfolioImageUrl={activeRequestTarget.portfolioImageUrl}
          serviceTitle={activeRequestTarget.serviceTitle}
          proName={activeRequestTarget.name}
          phoneNumber={activeRequestTarget.phoneNumber}
          proEmail={activeRequestTarget.proEmail}
          initialMessage={buildMatchRequestPrefillMessage(request)}
          initialInspirationName={request?.imageName ?? ''}
          initialCurrentPhotoName={request?.currentPhotoName ?? ''}
          initialInspirationFile={requestUploadPrefill.inspiration}
          initialCurrentPhotoFile={requestUploadPrefill.current}
          onSubmit={addRequestSubmission}
        />
      ) : null}
    </div>
  )
}

function rankProfessionals(
  request?: MatchRequestDraft,
): MatchResultsRankedProfessional[] {
  const query = request?.location.trim().toLowerCase() ?? ''
  const requestedTags = (request?.tags ?? []).map(normalizeToken)

  const scored = professionalsSeed
    .map((pro) => {
      const locationMatch =
        query.length > 0 && pro.city.toLowerCase().includes(query)
      const rankedItems = pro.portfolioItems
        .map((item) => {
          const itemTagSet = new Set(item.tags.map(normalizeToken))
          const tagMatchCount = requestedTags.filter((tag) => itemTagSet.has(tag)).length
          const categoryMatch =
            Boolean(request?.category) && request?.category === item.category

          const categoryScore = categoryMatch ? 18 : 0
          const locationScore = locationMatch ? 12 : 0
          const tagScore = Math.min(tagMatchCount * 6, 18)
          const imageBonus = request?.imageName ? 3 : 0
          const notesBonus = request?.notes.trim() ? 2 : 0
          const proQualityScore = (pro.rating - 4) * 7

          const score = Math.min(
            99,
            Math.round(
              58 +
                categoryScore +
                locationScore +
                tagScore +
                imageBonus +
                notesBonus +
                proQualityScore,
            ),
          )

          return {
            item,
            score,
            categoryMatch,
            tagMatchCount,
          }
        })
        .sort((a, b) => b.score - a.score)

      const bestItemResult = rankedItems[0]
      const bestItem = bestItemResult?.item ?? pro.portfolioItems[0]
      const bestScore = bestItemResult?.score ?? Math.round(58 + (pro.rating - 4) * 7)

      const labels: string[] = []
      if (bestItemResult?.categoryMatch) labels.push('Category match')
      if (locationMatch) labels.push('Near your location')
      if ((bestItemResult?.tagMatchCount ?? 0) > 0) {
        labels.push(`${bestItemResult?.tagMatchCount} tag match`)
      }
      if (!labels.length) labels.push('Top rated')

      return {
        id: pro.id,
        name: pro.displayName,
        title: pro.title,
        city: pro.city,
        rating: pro.rating,
        portfolioImageUrl: bestItem?.afterImageUrl ?? bestItem?.beforeImageUrl ?? '',
        portfolioItemId: bestItem?.id ?? `fallback-${pro.id}`,
        serviceTitle: bestItem?.serviceTitle ?? `${pro.title} style`,
        phoneNumber: pro.bookingPhone ?? '+17135551234',
        proEmail: pro.bookingEmail,
        score: bestScore,
        scoreLabel: `${bestScore}% fit`,
        labels: labels.slice(0, 3),
        matchedPieces: rankedItems.slice(0, 3).map(({ item, score }) => ({
          id: item.id,
          imageUrl: item.afterImageUrl ?? item.beforeImageUrl,
          serviceTitle: item.serviceTitle,
          scoreLabel: `${score}% fit`,
        })),
      }
    })
    .sort((a, b) => b.score - a.score)

  const targetCount = Math.min(6, Math.max(3, scored.length))
  return scored.slice(0, targetCount)
}

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}
