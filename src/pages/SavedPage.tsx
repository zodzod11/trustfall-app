import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { TrustfallLogo } from '../components/brand/TrustfallLogo'
import { PortfolioCard, type PortfolioFeedItem } from '../components/explore/PortfolioCard'
import { useExplorePortfolio } from '../hooks/useExplorePortfolio'
import { useSaved } from '../hooks/useSaved'
import {
  normalizeSavedPortfolioItemId,
  normalizeSavedProfessionalId,
} from '../lib/demoCatalogIds'
import type { Professional } from '../types'
import { professionalFromFeedItems } from '../utils/portfolioItemFromFeed'

export function SavedPage() {
  const {
    savedPortfolioItemIds,
    savedProfessionalIds,
    hydrated: savedHydrated,
    error: savedError,
    refresh: refreshSaved,
  } = useSaved()
  const {
    items: portfolioFeed,
    loading: catalogLoading,
    error: catalogError,
    refetch,
  } = useExplorePortfolio()

  const savedPortfolioItems = useMemo(
    () =>
      savedPortfolioItemIds
        .map((itemId) => {
          const normalizedItemId = normalizeSavedPortfolioItemId(itemId)
          return portfolioFeed.find((item) => item.id === normalizedItemId)
        })
        .filter((item): item is PortfolioFeedItem => Boolean(item)),
    [savedPortfolioItemIds, portfolioFeed],
  )

  const savedProfessionals = useMemo(
    () =>
      savedProfessionalIds
        .map((proId) => professionalFromFeedItems(normalizeSavedProfessionalId(proId), portfolioFeed))
        .filter((pro): pro is Professional => Boolean(pro)),
    [savedProfessionalIds, portfolioFeed],
  )

  const hasSavedIds = savedPortfolioItemIds.length > 0 || savedProfessionalIds.length > 0
  const resolvedEmpty = savedPortfolioItems.length === 0 && savedProfessionals.length === 0
  const catalogUnavailable = Boolean(catalogError) && portfolioFeed.length === 0
  const hasUnresolvedSaved = hasSavedIds && !catalogLoading && !catalogUnavailable && resolvedEmpty

  return (
    <div className="space-y-5">
      <header className="sticky top-0 z-20 -mx-4 border-b border-white/5 bg-background/80 px-4 pb-4 pt-1 backdrop-blur-xl sm:-mx-5 sm:px-5">
        <div className="grid grid-cols-[auto_1fr_44px] items-center gap-1">
          <Link
            to="/explore"
            aria-label="Trustfall home"
            className="group inline-flex min-h-10 min-w-0 max-w-[min(120px,28vw)] items-center justify-start rounded-lg px-0.5 transition hover:bg-surface-elevated/80"
          >
            <TrustfallLogo size="header" className="max-h-8" />
          </Link>
          <div className="text-center">
            <h1 className="text-center text-[2rem] font-semibold tracking-tight text-primary">
              Saved
            </h1>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              Your list
            </p>
          </div>
          <span aria-hidden className="h-10 w-10" />
        </div>
      </header>

      {hasSavedIds && !catalogUnavailable ? (
        <p className="text-xs font-medium text-muted">
          {savedPortfolioItems.length + savedProfessionals.length} saved item
          {savedPortfolioItems.length + savedProfessionals.length === 1 ? '' : 's'}
          {catalogLoading ? ' · loading catalog…' : catalogError ? ' · catalog unavailable' : ''}
        </p>
      ) : null}

      {savedError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
          {savedError}
        </div>
      ) : null}

      {!savedHydrated ? (
        <div className="tf-card px-5 py-7 text-center text-sm text-muted">Loading your saved items…</div>
      ) : null}

      {catalogUnavailable && hasSavedIds ? (
        <div className="tf-card space-y-3 px-5 py-9 text-center">
          <p className="text-base font-semibold text-foreground">
            Couldn&apos;t load your saved collection
          </p>
          <p className="text-sm text-muted">
            Your saves are synced to your account, but the live catalog could not be reached right now.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                void refreshSaved()
                void refetch()
              }}
              className="tf-button-primary w-full"
            >
              Retry Catalog
            </button>
            <Link to="/explore" className="tf-button-secondary w-full">
              Explore Looks
            </Link>
          </div>
        </div>
      ) : null}

      {!hasSavedIds && savedHydrated ? (
        <div className="tf-card space-y-3 px-5 py-9 text-center">
          <p className="text-base font-semibold text-foreground">
            Nothing saved yet
          </p>
          <p className="text-sm text-muted">
            Tap Use This Look or Save Pro on an Explore detail page to build your collection.
          </p>
          <Link to="/explore" className="tf-button-primary mt-2 w-full">
            Explore Looks
          </Link>
        </div>
      ) : null}

      {hasUnresolvedSaved ? (
        <div className="tf-card space-y-3 px-5 py-7 text-center">
          <p className="text-base font-semibold text-foreground">Some saved items are unavailable</p>
          <p className="text-sm text-muted">
            Your saved IDs are synced, but those looks or pros are not in the current published catalog.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                void refreshSaved()
                void refetch()
              }}
              className="tf-button-secondary w-full"
            >
              Refresh Catalog
            </button>
            <Link to="/explore" className="tf-button-primary w-full">
              Browse Explore
            </Link>
          </div>
        </div>
      ) : null}

      {savedPortfolioItems.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">
            Saved Looks
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {savedPortfolioItems.map((item) => (
              <PortfolioCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      {savedProfessionals.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">
            Saved Professionals
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {savedProfessionals.map((pro) => {
              const spotlight = pro.portfolioItems[0]
              return (
                <article key={pro.id} className="tf-card overflow-hidden">
                  <div className="grid grid-cols-[88px_1fr] gap-3 p-3">
                    <div className="h-[88px] w-[88px] overflow-hidden rounded-xl bg-surface-elevated">
                      {spotlight ? (
                        <img
                          src={spotlight.afterImageUrl}
                          alt={`${pro.displayName} spotlight`}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 space-y-1 py-1">
                      <Link
                        to={`/pros/${pro.id}`}
                        className="truncate text-sm font-semibold text-foreground transition hover:text-accent"
                      >
                        {pro.displayName}
                      </Link>
                      <p className="text-xs text-muted">
                        {pro.title} · {pro.city}
                      </p>
                      <p className="text-xs text-secondary">
                        {pro.rating.toFixed(1)} rating · {pro.reviewCount} reviews
                      </p>
                      {spotlight ? (
                        <Link
                          to={`/explore/${spotlight.id}`}
                          className="inline-flex pt-1 text-xs font-medium text-accent"
                        >
                          View latest look →
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ) : null}
    </div>
  )
}
