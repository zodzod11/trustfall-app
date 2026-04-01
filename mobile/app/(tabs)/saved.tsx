import { Link, router } from 'expo-router'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { PortfolioCard } from '@/components/explore/PortfolioCard'
import { TrustfallBrandMark, TrustfallScreenHeader } from '@/components/layout/TrustfallScreenHeader'
import { TfButton } from '@/components/ui/TfButton'
import { professionalsSeed } from '@/data/seed'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'
import { buildPortfolioFeed } from '@/lib/buildPortfolioFeed'
import { useSaved } from '@/hooks/useSaved'
import type { PortfolioFeedItem } from '@/types'

export default function SavedScreen() {
  const { savedPortfolioItemIds, savedProfessionalIds } = useSaved()

  const portfolioFeed: PortfolioFeedItem[] = buildPortfolioFeed()

  const savedPortfolioItems = savedPortfolioItemIds
    .map((itemId) => portfolioFeed.find((item) => item.id === itemId))
    .filter((item): item is PortfolioFeedItem => Boolean(item))

  const savedProfessionals = savedProfessionalIds
    .map((proId) => professionalsSeed.find((pro) => pro.id === proId))
    .filter((pro): pro is (typeof professionalsSeed)[number] => Boolean(pro))

  const isEmpty = savedPortfolioItems.length === 0 && savedProfessionals.length === 0

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TrustfallScreenHeader
        title="Saved"
        subtitle="Your list"
        left={<TrustfallBrandMark />}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {!isEmpty ? (
          <Text style={styles.count}>
            {savedPortfolioItems.length + savedProfessionals.length} saved item
            {savedPortfolioItems.length + savedProfessionals.length === 1 ? '' : 's'}
          </Text>
        ) : null}

        {isEmpty ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing saved yet</Text>
            <Text style={styles.emptyBody}>
              Save looks and pros from Explore to build your collection.
            </Text>
            <TfButton title="Explore looks" onPress={() => router.push('/explore')} />
          </View>
        ) : null}

        {savedPortfolioItems.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Saved looks</Text>
            {savedPortfolioItems.map((item) => (
              <View key={item.id} style={styles.cardSpaced}>
                <PortfolioCard item={item} />
              </View>
            ))}
          </View>
        ) : null}

        {savedProfessionals.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Saved professionals</Text>
            {savedProfessionals.map((pro) => {
              const spotlight = pro.portfolioItems[0]
              return (
                <Link key={pro.id} href={`/pro/${pro.id}`} style={styles.proCard}>
                  <View style={styles.proRow}>
                    {spotlight ? (
                      <Image source={{ uri: spotlight.afterImageUrl }} style={styles.proThumb} />
                    ) : (
                      <View style={styles.proThumb} />
                    )}
                    <View style={styles.proMeta}>
                      <Text style={styles.proName}>{pro.displayName}</Text>
                      <Text style={styles.proSub}>
                        {pro.title} · {pro.city}
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
  count: { fontSize: 12, fontWeight: '600', color: TrustfallColors.muted },
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
})
