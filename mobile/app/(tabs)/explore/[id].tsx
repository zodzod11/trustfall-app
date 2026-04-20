import { Image } from 'expo-image'
import { Link, router, useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { DEFAULT_REQUEST_MESSAGE, RequestBookingModal } from '@/components/booking/RequestBookingModal'
import { PortfolioCard } from '@/components/explore/PortfolioCard'
import { TfButton } from '@/components/ui/TfButton'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'
import { useExplorePortfolio } from '@/hooks/useExplorePortfolio'
import { buildPortfolioFeed } from '@/lib/buildPortfolioFeed'
import { formatDisplayLabel } from '@/lib/formatDisplayLabel'
import { useSaved } from '@/hooks/useSaved'
import type { PortfolioFeedItem } from '@/types'

type DetailItem = PortfolioFeedItem & {
  professionalRating: number
  professionalReviewCount: number
  professionalRequestCount: number
  professionalYearsExperience: number
  professionalAbout: string
}

export default function ExploreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const routeItemId = typeof id === 'string' ? id : ''
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  /** Side-by-side pair: height capped so After + Before fit on screen without scrolling between them. */
  const scrollHorizontalPad = TrustfallSpacing.lg * 2
  const pairGap = TrustfallSpacing.md
  const columnWidth = Math.max(100, (windowWidth - scrollHorizontalPad - pairGap) / 2)
  const heroPairHeight = Math.min(
    Math.round(columnWidth * 1.22),
    Math.round(windowHeight * 0.34),
    300,
  )
  const [requestOpen, setRequestOpen] = useState(false)
  const [prefill, setPrefill] = useState(DEFAULT_REQUEST_MESSAGE)
  const { items: remoteItems, loading, error, remoteEnabled, refetch } = useExplorePortfolio()
  const {
    addRequestSubmission,
    isPortfolioItemSaved,
    isProfessionalSaved,
    togglePortfolioItem,
    toggleProfessional,
  } = useSaved()

  const devSeedFeed = useMemo(
    () => (__DEV__ ? (buildPortfolioFeed() as DetailItem[]) : []),
    [],
  )
  const detailFeed = __DEV__ && remoteItems.length === 0 ? devSeedFeed : remoteItems

  const selectedItem = useMemo(() => {
    if (detailFeed.length > 0) {
      const r = detailFeed.find((x) => x.id === routeItemId)
      if (r) {
        return {
          ...r,
          professionalRating: r.professionalRating ?? 0,
          professionalReviewCount: r.professionalReviewCount ?? 0,
          professionalRequestCount: r.professionalRequestCount ?? 0,
          professionalYearsExperience: r.professionalYearsExperience ?? 0,
          professionalAbout: r.professionalAbout ?? '',
        } as DetailItem
      }
    }
    return null
  }, [detailFeed, routeItemId])
  const catalogForMore = detailFeed

  const moreFromSame = useMemo(() => {
    if (!selectedItem) return []
    return catalogForMore
      .filter(
        (item) => item.professionalId === selectedItem.professionalId && item.id !== selectedItem.id,
      )
      .slice(0, 4)
  }, [catalogForMore, selectedItem])

  if (loading && !selectedItem) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <View style={styles.empty}>
          <ActivityIndicator color={TrustfallColors.primary} />
          <Text style={styles.emptyTitle}>Loading look…</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!selectedItem) {
    const title = !remoteEnabled
      ? 'Catalog unavailable'
      : error
        ? 'Couldn’t load this look'
        : 'Look not found'
    const body = !remoteEnabled
      ? 'This build is not configured for the live provider catalog yet.'
      : error
        ? error
        : 'This look is not in the currently published live catalog.'
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{title}</Text>
          <Text style={styles.emptyBody}>{body}</Text>
          {remoteEnabled && error ? (
            <TfButton title="Retry" onPress={() => void refetch()} />
          ) : (
            <TfButton title="Return to Explore" onPress={() => router.replace('/explore')} />
          )}
        </View>
      </SafeAreaView>
    )
  }

  const pieceDescription = selectedItem.description?.trim()
  const aboutSectionBody =
    pieceDescription || selectedItem.professionalAbout?.trim()

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Explore</Text>
        </Pressable>

        <View style={styles.heroRow}>
          <View style={styles.heroCol}>
            <Text style={styles.eyebrow}>Before</Text>
            <View style={[styles.heroViewport, { height: heroPairHeight }]}>
              <Image
                source={{ uri: selectedItem.beforeImageUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                accessibilityLabel="Before photo, full image"
                transition={180}
              />
            </View>
          </View>
          <View style={styles.heroCol}>
            <Text style={styles.eyebrow}>After</Text>
            <View style={[styles.heroViewport, { height: heroPairHeight }]}>
              <Image
                source={{ uri: selectedItem.afterImageUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                accessibilityLabel="After photo, full image"
                transition={180}
              />
            </View>
          </View>
        </View>

        <Text style={styles.h1}>{selectedItem.serviceTitle}</Text>
        <Link href={`/pro/${selectedItem.professionalId}`} asChild>
          <Pressable>
            <Text style={styles.proLine}>
              {selectedItem.professionalName} · {selectedItem.professionalTitle}
            </Text>
          </Pressable>
        </Link>
        <Text style={styles.meta}>
          {selectedItem.location} · ${selectedItem.price} ·{' '}
          {selectedItem.professionalRating.toFixed(1)}★
        </Text>
        <View style={styles.tagRow}>
          {selectedItem.tags.map((t) => (
            <View key={t} style={styles.tag}>
              <Text style={styles.tagText}>{formatDisplayLabel(t)}</Text>
            </View>
          ))}
        </View>

        {aboutSectionBody ? (
          <View style={styles.aboutBox}>
            <Text style={styles.aboutEyebrow}>
              {pieceDescription ? 'About this look' : 'About this professional'}
            </Text>
            <Text style={styles.aboutBody}>{aboutSectionBody}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <TfButton
            title={isPortfolioItemSaved(selectedItem.id) ? 'Saved' : 'Save look'}
            variant={isPortfolioItemSaved(selectedItem.id) ? 'secondary' : 'primary'}
            onPress={() => togglePortfolioItem(selectedItem.id)}
          />
          <TfButton
            title={isProfessionalSaved(selectedItem.professionalId) ? 'Pro saved' : 'Save pro'}
            variant="secondary"
            onPress={() => toggleProfessional(selectedItem.professionalId)}
          />
        </View>

        <TfButton
          title="Request this look"
          onPress={() => {
            setPrefill(DEFAULT_REQUEST_MESSAGE)
            setRequestOpen(true)
          }}
        />

        {moreFromSame.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>More from this pro</Text>
            {moreFromSame.map((item) => (
              <View key={item.id} style={styles.cardSpaced}>
                <PortfolioCard item={item} view="list" />
              </View>
            ))}
          </>
        ) : null}

      </ScrollView>

      <RequestBookingModal
        visible={requestOpen}
        onClose={() => setRequestOpen(false)}
        professionalId={selectedItem.professionalId}
        portfolioItemId={selectedItem.id}
        portfolioImageUrl={selectedItem.afterImageUrl}
        serviceTitle={selectedItem.serviceTitle}
        serviceDescription={selectedItem.description}
        serviceTags={selectedItem.tags}
        categorySnapshot={selectedItem.category}
        proName={selectedItem.professionalName}
        phoneNumber={selectedItem.professionalPhone}
        proEmail={selectedItem.professionalEmail}
        initialMessage={prefill}
        onSubmit={addRequestSubmission}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: TrustfallColors.background },
  scroll: { padding: TrustfallSpacing.lg, paddingBottom: 48, gap: TrustfallSpacing.md },
  back: { alignSelf: 'flex-start', marginBottom: TrustfallSpacing.sm },
  backText: { fontSize: 14, fontWeight: '600', color: TrustfallColors.muted },
  heroRow: {
    flexDirection: 'row',
    gap: TrustfallSpacing.md,
    alignItems: 'flex-start',
  },
  heroCol: { flex: 1, minWidth: 0, gap: TrustfallSpacing.sm },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  /** Half-width panels: Before (left) · After (right). */
  heroViewport: {
    width: '100%',
    borderRadius: TrustfallRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#080c18',
  },
  aboutBox: {
    padding: TrustfallSpacing.lg,
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: 'rgba(23,31,51,0.45)',
    gap: TrustfallSpacing.sm,
  },
  aboutEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  aboutBody: { fontSize: 14, lineHeight: 21, color: TrustfallColors.secondary },
  h1: { fontSize: 26, fontWeight: '700', color: TrustfallColors.foreground, letterSpacing: -0.3 },
  proLine: { fontSize: 15, fontWeight: '600', color: TrustfallColors.accent },
  meta: { fontSize: 14, color: TrustfallColors.muted },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: TrustfallSpacing.sm },
  tag: {
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    borderRadius: 999,
    paddingHorizontal: TrustfallSpacing.md,
    paddingVertical: TrustfallSpacing.xs,
  },
  tagText: { fontSize: 11, fontWeight: '600', color: TrustfallColors.secondary },
  actions: { flexDirection: 'row', gap: TrustfallSpacing.md },
  sectionLabel: {
    marginTop: TrustfallSpacing.lg,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  cardSpaced: { marginBottom: TrustfallSpacing.md },
  note: { fontSize: 12, color: TrustfallColors.muted, textAlign: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: TrustfallSpacing.lg, padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TrustfallColors.foreground },
})
