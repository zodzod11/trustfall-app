import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  DEFAULT_REQUEST_MESSAGE,
  RequestModal,
} from '../components/explore/RequestModal'
import { PageHeader } from '../components/layout/PageHeader'
import { professionalsSeed } from '../data/seed'
import { useSaved } from '../hooks/useSaved'
import type { MatchRequestDraft } from '../types'

type MatchResultsState = {
  request?: MatchRequestDraft
}

type RankedProfessional = {
  id: string
  name: string
  title: string
  city: string
  rating: number
  portfolioImageUrl: string
  portfolioItemId: string
  serviceTitle: string
  phoneNumber: string
  scoreLabel: string
  labels: string[]
}

export function MatchResultsPage() {
  const location = useLocation()
  const state = (location.state as MatchResultsState | null) ?? null
  const request = state?.request
  const [isPending, setIsPending] = useState(true)
  const [activeRequestTarget, setActiveRequestTarget] =
    useState<RankedProfessional | null>(null)
  const { requestSubmissions, addRequestSubmission } = useSaved()

  const ranked: RankedProfessional[] = useMemo(
    () => rankProfessionals(request),
    [request],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsPending(false)
    }, 1400)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="space-y-8">
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
          {ranked.map((item, i) => (
            <li key={item.id} className="tf-card overflow-hidden">
              <div className="grid grid-cols-[112px_1fr] gap-4 p-4">
                <div className="relative h-[128px] overflow-hidden rounded-xl bg-surface-elevated">
                  <img
                    src={item.portfolioImageUrl}
                    alt={`${item.name} portfolio result`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/85 text-xs font-semibold text-accent">
                    {i + 1}
                  </div>
                </div>
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-base font-semibold text-foreground">{item.name}</h2>
                    <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                      {item.scoreLabel}
                    </span>
                  </div>
                  <p className="text-sm text-secondary">
                    {item.title} · {item.city}
                  </p>
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
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveRequestTarget(item)}
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
          ))}
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

      {activeRequestTarget ? (
        <RequestModal
          onClose={() => setActiveRequestTarget(null)}
          portfolioItemId={activeRequestTarget.portfolioItemId}
          portfolioImageUrl={activeRequestTarget.portfolioImageUrl}
          serviceTitle={activeRequestTarget.serviceTitle}
          proName={activeRequestTarget.name}
          phoneNumber={activeRequestTarget.phoneNumber}
          initialMessage={
            request?.notes.trim()
              ? `${DEFAULT_REQUEST_MESSAGE} ${request.notes.trim()}`
              : DEFAULT_REQUEST_MESSAGE
          }
          onSubmit={addRequestSubmission}
        />
      ) : null}
    </div>
  )
}

function rankProfessionals(request?: MatchRequestDraft): RankedProfessional[] {
  const query = request?.location.trim().toLowerCase() ?? ''

  const scored = professionalsSeed
    .map((pro) => {
      const portfolioTags = new Set(pro.portfolioItems.flatMap((item) => item.tags))
      const tagMatches = (request?.tags ?? []).filter((tag) => portfolioTags.has(tag))
      const categoryMatch = Boolean(request?.category) && request?.category === pro.category
      const locationMatch =
        query.length > 0 && pro.city.toLowerCase().includes(query)

      const categoryScore = categoryMatch ? 16 : 0
      const locationScore = locationMatch ? 12 : 0
      const tagScore = Math.min(tagMatches.length * 5, 15)
      const imageBonus = request?.imageName ? 3 : 0
      const notesBonus = request?.notes.trim() ? 2 : 0

      const score = Math.min(
        99,
        Math.round(
          62 +
            categoryScore +
            locationScore +
            tagScore +
            imageBonus +
            notesBonus +
            (pro.rating - 4) * 7,
        ),
      )

      const labels: string[] = []
      if (categoryMatch) labels.push('Category match')
      if (locationMatch) labels.push('Near your location')
      if (tagMatches.length > 0) labels.push(`${tagMatches.length} tag match`)
      if (!labels.length) labels.push('Top rated')

      const portfolioImageUrl =
        pro.portfolioItems[0]?.afterImageUrl ?? pro.portfolioItems[0]?.beforeImageUrl ?? ''
      const portfolioItemId = pro.portfolioItems[0]?.id ?? `fallback-${pro.id}`
      const serviceTitle = pro.portfolioItems[0]?.serviceTitle ?? `${pro.title} style`
      const phoneNumberById: Record<string, string> = {
        pro_001: '+15125550101',
        pro_002: '+17135550202',
        pro_003: '+19725550303',
        pro_004: '+17135550404',
      }

      return {
        id: pro.id,
        name: pro.displayName,
        title: pro.title,
        city: pro.city,
        rating: pro.rating,
        portfolioImageUrl,
        portfolioItemId,
        serviceTitle,
        phoneNumber: phoneNumberById[pro.id] ?? '+17135551234',
        score,
        scoreLabel: `${score}% fit`,
        labels: labels.slice(0, 3),
      }
    })
    .sort((a, b) => b.score - a.score)

  const targetCount = Math.min(6, Math.max(3, scored.length))
  return scored.slice(0, targetCount)
}
