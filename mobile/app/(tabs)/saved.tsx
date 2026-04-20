import { Link, router } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { PortfolioCard } from '@/components/explore/PortfolioCard'
import { TrustfallBrandMark, TrustfallScreenHeader } from '@/components/layout/TrustfallScreenHeader'
import { TfButton } from '@/components/ui/TfButton'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'
import { useExplorePortfolio } from '@/hooks/useExplorePortfolio'
import { useSaved } from '@/hooks/useSaved'
import type { PortfolioFeedItem } from '@/types'

type SavedTab = 'looks' | 'pros'
type SavedProfessionalCard = {
  id: string
  displayName: string
  title: string
  city: string
  rating: number
  requestCount: number
  spotlightImageUrl?: string
}

function buildSavedProfessionalCard(
  professionalId: string,
  feed: PortfolioFeedItem[],
): SavedProfessionalCard | null {
  const items = feed.filter((item) => item.professionalId === professionalId)
  if (items.length === 0) return null
  const first = items[0]
  return {
    id: professionalId,
    displayName: first.professionalName,
    title: first.professionalTitle,
    city: first.location,
    rating: first.professionalRating ?? 0,
    requestCount: first.professionalRequestCount ?? 0,
    spotlightImageUrl: first.afterImageUrl || first.beforeImageUrl || undefined,
  }
}

export default function SavedScreen() {
  const {
    savedPortfolioItemIds,
    savedProfessionalIds,
    hydrated: savedHydrated,
    error: savedError,
    refresh: refreshSaved,
  } = useSaved()
  const [activeTab, setActiveTab] = useState<SavedTab>('looks')
  const { items: portfolioFeed, loading: catalogLoading, error: catalogError, remoteEnabled, refetch } =
    useExplorePortfolio()

  const savedPortfolioItems = useMemo(
    () =>
      savedPortfolioItemIds
        .map((itemId) => portfolioFeed.find((item) => item.id === itemId))
        .filter((item): item is PortfolioFeedItem => Boolean(item)),
    [portfolioFeed, savedPortfolioItemIds],
  )

  const savedProfessionals = useMemo(
    () =>
      savedProfessionalIds
        .map((proId) => buildSavedProfessionalCard(proId, portfolioFeed))
        .filter((pro): pro is SavedProfessionalCard => Boolean(pro)),
    [portfolioFeed, savedProfessionalIds],
  )

  const hasSavedIds = savedPortfolioItemIds.length > 0 || savedProfessionalIds.length > 0
  const isEmpty = savedPortfolioItems.length === 0 && savedProfessionals.length === 0
  const catalogUnavailable = (!remoteEnabled || Boolean(catalogError)) && portfolioFeed.length === 0
  const hasUnresolvedSaved = hasSavedIds && !catalogLoading && !catalogUnavailable && isEmpty

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (activeTab === 'looks' && savedPortfolioItems.length === 0 && savedProfessionals.length > 0) {
        setActiveTab('pros')
      }
      if (activeTab === 'pros' && savedProfessionals.length === 0 && savedPortfolioItems.length > 0) {
        setActiveTab('looks')
      }
    }, 0)
    return () => clearTimeout(timeout)
  }, [activeTab, savedPortfolioItems.length, savedProfessionals.length])

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TrustfallScreenHeader
        title="Saved"
        subtitle="Your list"
        left={<TrustfallBrandMark />}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {!isEmpty ? (
          <View style={styles.tabs}>
            <Pressable
              onPress={() => setActiveTab('looks')}
              style={[styles.tabBtn, activeTab === 'looks' && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, activeTab === 'looks' && styles.tabTextActive]}>
                Saved portfolios ({savedPortfolioItems.length})
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('pros')}
              style={[styles.tabBtn, activeTab === 'pros' && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, activeTab === 'pros' && styles.tabTextActive]}>
                Saved pros ({savedProfessionals.length})
              </Text>
            </Pressable>
          </View>
        ) : null}

        {savedError ? (
          <View style={styles.bannerError}>
            <Text style={styles.bannerErrorTitle}>Couldn’t sync saved items</Text>
            <Text style={styles.bannerErrorBody}>{savedError}</Text>
          </View>
        ) : null}

        {!savedHydrated ? (
          <View style={styles.emptyMini}>
            <Text style={styles.emptyTitle}>Loading your saved items…</Text>
          </View>
        ) : null}

        {!hasSavedIds && savedHydrated ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing saved yet</Text>
            <Text style={styles.emptyBody}>
              Save looks and pros from Explore to build your collection.
            </Text>
            <TfButton title="Explore looks" onPress={() => router.push('/explore')} />
          </View>
        ) : null}

        {catalogUnavailable && hasSavedIds ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Saved catalog unavailable</Text>
            <Text style={styles.emptyBody}>
              Your saves are synced to your account, but no catalog data could be loaded for this build.
            </Text>
            <View style={styles.ctaRow}>
              <TfButton
                title="Retry"
                onPress={() => {
                  void refreshSaved()
                  void refetch()
                }}
              />
              <TfButton title="Browse Explore" variant="secondary" onPress={() => router.push('/explore')} />
            </View>
          </View>
        ) : null}

        {hasUnresolvedSaved ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Saved items aren’t in the current catalog</Text>
            <Text style={styles.emptyBody}>
              Your saved IDs are synced, but those looks or pros are not in the currently published live catalog.
            </Text>
            <View style={styles.ctaRow}>
              <TfButton
                title="Refresh"
                onPress={() => {
                  void refreshSaved()
                  void refetch()
                }}
              />
              <TfButton title="Browse Explore" variant="secondary" onPress={() => router.push('/explore')} />
            </View>
          </View>
        ) : null}

        {!isEmpty && activeTab === 'looks' && savedPortfolioItems.length === 0 ? (
          <View style={styles.emptyMini}>
            <Text style={styles.emptyTitle}>No saved portfolios yet</Text>
            <Text style={styles.emptyBody}>
              Save looks from Explore to keep your favorite before-and-afters here.
            </Text>
          </View>
        ) : null}

        {!isEmpty && activeTab === 'pros' && savedProfessionals.length === 0 ? (
          <View style={styles.emptyMini}>
            <Text style={styles.emptyTitle}>No saved pros yet</Text>
            <Text style={styles.emptyBody}>
              Save professionals from Explore to compare them later.
            </Text>
          </View>
        ) : null}

        {activeTab === 'looks' && savedPortfolioItems.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Saved looks</Text>
            {savedPortfolioItems.map((item) => (
              <View key={item.id} style={styles.cardSpaced}>
                <PortfolioCard item={item} />
              </View>
            ))}
          </View>
        ) : null}

        {activeTab === 'pros' && savedProfessionals.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Saved professionals</Text>
            {savedProfessionals.map((pro) => {
              return (
                <Link key={pro.id} href={`/pro/${pro.id}`} style={styles.proCard}>
                  <View style={styles.proRow}>
                    {pro.spotlightImageUrl ? (
                      <Image source={{ uri: pro.spotlightImageUrl }} style={styles.proThumb} />
                    ) : (
                      <View style={styles.proThumb} />
                    )}
                    <View style={styles.proMeta}>
                      <Text style={styles.proName} numberOfLines={1}>
                        {pro.displayName}
                      </Text>
                      <Text style={styles.proSub} numberOfLines={2}>
                        {pro.title} · {pro.city}
                      </Text>
                      <Text style={styles.proHint}>
                        {pro.rating.toFixed(1)} rating · {pro.requestCount} requests
                      </Text>
                    </View>
                  </View>
                </Link>
              )
            })}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: TrustfallColors.background },
  scroll: { padding: TrustfallSpacing.lg, paddingBottom: 100, gap: TrustfallSpacing.lg },
  tabs: {
    flexDirection: 'row',
    gap: TrustfallSpacing.sm,
    padding: TrustfallSpacing.xs,
    borderRadius: TrustfallRadius.xl,
    backgroundColor: TrustfallColors.surface,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
  },
  tabBtn: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: TrustfallRadius.lg,
    paddingHorizontal: TrustfallSpacing.md,
  },
  tabBtnActive: {
    backgroundColor: TrustfallColors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: TrustfallColors.muted,
    textAlign: 'center',
  },
  tabTextActive: {
    color: TrustfallColors.primaryForeground,
  },
  section: { gap: TrustfallSpacing.md },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  cardSpaced: { marginBottom: TrustfallSpacing.sm },
  empty: {
    padding: TrustfallSpacing.xxl,
    borderRadius: TrustfallRadius.xl,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    alignItems: 'center',
    gap: TrustfallSpacing.md,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TrustfallColors.foreground },
  emptyBody: { fontSize: 14, color: TrustfallColors.muted, textAlign: 'center' },
  ctaRow: {
    width: '100%',
    gap: TrustfallSpacing.sm,
  },
  emptyMini: {
    padding: TrustfallSpacing.xl,
    borderRadius: TrustfallRadius.xl,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
    alignItems: 'center',
    gap: TrustfallSpacing.sm,
  },
  proCard: {
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
    overflow: 'hidden',
    marginBottom: TrustfallSpacing.sm,
  },
  proRow: { flexDirection: 'row', gap: TrustfallSpacing.md, padding: TrustfallSpacing.md },
  proThumb: {
    width: 88,
    height: 88,
    borderRadius: TrustfallRadius.lg,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  proMeta: { flex: 1, justifyContent: 'center', gap: 4 },
  proName: { fontSize: 15, fontWeight: '700', color: TrustfallColors.foreground },
  proSub: { fontSize: 12, color: TrustfallColors.muted },
  proHint: { fontSize: 11, color: TrustfallColors.secondary },
  bannerError: {
    padding: TrustfallSpacing.md,
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(252, 165, 165, 0.4)',
    backgroundColor: 'rgba(127, 29, 29, 0.25)',
    gap: 4,
  },
  bannerErrorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TrustfallColors.foreground,
  },
  bannerErrorBody: {
    fontSize: 12,
    color: '#fecaca',
  },
})
