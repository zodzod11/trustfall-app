import { Image } from 'expo-image'
import { Link, router, useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { DEFAULT_REQUEST_MESSAGE, RequestBookingModal } from '@/components/booking/RequestBookingModal'
import { PortfolioCard } from '@/components/explore/PortfolioCard'
import { TfButton } from '@/components/ui/TfButton'
import { professionalsSeed } from '@/data/seed'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'
import { useExplorePortfolio } from '@/hooks/useExplorePortfolio'
import { useSaved } from '@/hooks/useSaved'
import type { PortfolioFeedItem } from '@/types'

type DetailItem = PortfolioFeedItem & {
  professionalRating: number
  professionalReviewCount: number
  professionalYearsExperience: number
  professionalAbout: string
}

export default function ExploreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [requestOpen, setRequestOpen] = useState(false)
  const [prefill, setPrefill] = useState(DEFAULT_REQUEST_MESSAGE)
  const { items: remoteItems, remoteEnabled } = useExplorePortfolio()
  const {
    requestSubmissions,
    addRequestSubmission,
    isPortfolioItemSaved,
    isProfessionalSaved,
    togglePortfolioItem,
    toggleProfessional,
  } = useSaved()

  const seedFeed: DetailItem[] = useMemo(
    () =>
      professionalsSeed.flatMap((pro) =>
        pro.portfolioItems.map((item) => ({
          ...item,
          professionalName: pro.displayName,
          professionalTitle: pro.title,
          location: pro.city,
          professionalRating: pro.rating,
          professionalReviewCount: pro.reviewCount,
          professionalYearsExperience: pro.yearsExperience,
          professionalAbout: pro.about,
          professionalPhone: pro.bookingPhone,
          professionalEmail: pro.bookingEmail,
        })),
      ),
    [],
  )

  const selectedItem = useMemo(() => {
    if (remoteEnabled && remoteItems.length > 0) {
      const r = remoteItems.find((x) => x.id === id)
      if (r) {
        return {
          ...r,
          professionalRating: r.professionalRating ?? 0,
          professionalReviewCount: r.professionalReviewCount ?? 0,
          professionalYearsExperience: r.professionalYearsExperience ?? 0,
          professionalAbout: r.professionalAbout ?? '',
        } as DetailItem
      }
    }
    return seedFeed.find((item) => item.id === id)
  }, [id, remoteEnabled, remoteItems, seedFeed])
  const catalogForMore = remoteEnabled && remoteItems.length > 0 ? remoteItems : seedFeed

  const moreFromSame = useMemo(() => {
    if (!selectedItem) return []
    return catalogForMore
      .filter(
        (item) => item.professionalId === selectedItem.professionalId && item.id !== selectedItem.id,
      )
      .slice(0, 4)
  }, [catalogForMore, selectedItem])

  if (!selectedItem) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Look not found</Text>
          <TfButton title="Return to Explore" onPress={() => router.replace('/explore')} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Explore</Text>
        </Pressable>

        <View style={styles.heroRow}>
          <View style={styles.heroCol}>
            <Text style={styles.eyebrow}>Before</Text>
            <Image source={{ uri: selectedItem.beforeImageUrl }} style={styles.heroImg} contentFit="cover" />
          </View>
          <View style={styles.heroCol}>
            <Text style={styles.eyebrow}>After</Text>
            <Image source={{ uri: selectedItem.afterImageUrl }} style={styles.heroImg} contentFit="cover" />
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
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>

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

        {requestSubmissions.length > 0 ? (
          <Text style={styles.note}>{requestSubmissions.length} local request(s) on this device.</Text>
        ) : null}
      </ScrollView>

      <RequestBookingModal
        visible={requestOpen}
        onClose={() => setRequestOpen(false)}
        professionalId={selectedItem.professionalId}
        portfolioItemId={selectedItem.id}
        portfolioImageUrl={selectedItem.afterImageUrl}
        serviceTitle={selectedItem.serviceTitle}
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
  heroRow: { flexDirection: 'row', gap: TrustfallSpacing.sm },
  heroCol: { flex: 1, gap: TrustfallSpacing.sm },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  heroImg: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: TrustfallRadius.lg,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
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
