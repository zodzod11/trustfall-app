import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PortfolioCard } from '@/components/explore/PortfolioCard'
import { TfButton } from '@/components/ui/TfButton'
import { professionalsSeed } from '@/data/seed'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'
import type { PortfolioFeedItem } from '@/types'

const LIST_H_PADDING = TrustfallSpacing.lg * 2
const GRID_COLUMN_GAP = TrustfallSpacing.md

export default function ProfessionalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { width: windowWidth } = useWindowDimensions()
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid')

  const professional = professionalsSeed.find((pro) => pro.id === id)

  const portfolioItems: PortfolioFeedItem[] = useMemo(
    () =>
      professional
        ? professional.portfolioItems.map((item) => ({
            ...item,
            professionalName: professional.displayName,
            professionalTitle: professional.title,
            location: professional.city,
            professionalPhone: professional.bookingPhone,
            professionalEmail: professional.bookingEmail,
          }))
        : [],
    [professional],
  )

  const gridCellWidth = Math.max(
    140,
    Math.floor((windowWidth - LIST_H_PADDING - GRID_COLUMN_GAP) / 2),
  )

  const renderItem = useCallback(
    ({ item }: { item: PortfolioFeedItem }) => (
      <View
        style={
          viewMode === 'grid'
            ? [styles.gridCell, { width: gridCellWidth }]
            : styles.listCell
        }
      >
        <PortfolioCard item={item} view={viewMode} />
      </View>
    ),
    [viewMode, gridCellWidth],
  )

  const keyExtractor = useCallback((item: PortfolioFeedItem) => item.id, [])

  if (!professional) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Professional not found</Text>
          <TfButton title="Return to Explore" onPress={() => router.replace('/explore')} />
        </View>
      </SafeAreaView>
    )
  }

  const ListHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Explore</Text>
        </Pressable>

        <Text style={styles.eyebrow}>{professional.category}</Text>
        <Text style={styles.title}>{professional.displayName}</Text>
        <Text style={styles.sub}>
          {professional.title} · {professional.city}
        </Text>

        <View style={styles.about}>
          <Text style={styles.aboutText}>{professional.about}</Text>
          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Text style={styles.metricVal}>{professional.rating.toFixed(1)}</Text>
              <Text style={styles.metricLbl}>Rating</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricVal}>{professional.reviewCount}</Text>
              <Text style={styles.metricLbl}>Reviews</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricVal}>{professional.yearsExperience}</Text>
              <Text style={styles.metricLbl}>Years</Text>
            </View>
          </View>
        </View>

        <View style={styles.workRow}>
          <Text style={styles.sectionLabel}>All work</Text>
          <View style={styles.segment}>
            <Pressable
              onPress={() => setViewMode('grid')}
              style={[styles.segmentBtn, viewMode === 'grid' && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentLabel, viewMode === 'grid' && styles.segmentLabelActive]}>
                Grid
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setViewMode('list')}
              style={[styles.segmentBtn, viewMode === 'list' && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentLabel, viewMode === 'list' && styles.segmentLabelActive]}>
                List
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    ),
    [professional, viewMode],
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={portfolioItems}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={viewMode === 'grid' ? styles.columnWrap : undefined}
        removeClippedSubviews={viewMode === 'grid' ? false : undefined}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyInline}>
            <Text style={styles.emptyBody}>No portfolio items yet.</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: TrustfallColors.background },
  headerBlock: {
    paddingBottom: TrustfallSpacing.sm,
    gap: TrustfallSpacing.md,
  },
  listContent: {
    paddingHorizontal: TrustfallSpacing.lg,
    paddingBottom: 48,
    gap: TrustfallSpacing.lg,
  },
  columnWrap: {
    justifyContent: 'space-between',
    marginBottom: TrustfallSpacing.sm,
  },
  gridCell: {
    marginBottom: TrustfallSpacing.sm,
  },
  listCell: { width: '100%' },
  back: { fontSize: 14, fontWeight: '600', color: TrustfallColors.muted, marginBottom: TrustfallSpacing.xs },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  title: { fontSize: 32, fontWeight: '700', color: TrustfallColors.foreground, letterSpacing: -0.5 },
  sub: { fontSize: 16, color: TrustfallColors.secondary },
  about: {
    padding: TrustfallSpacing.lg,
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
    gap: TrustfallSpacing.lg,
  },
  aboutText: { fontSize: 15, lineHeight: 22, color: TrustfallColors.muted },
  metrics: { flexDirection: 'row', gap: TrustfallSpacing.sm },
  metric: {
    flex: 1,
    padding: TrustfallSpacing.md,
    borderRadius: TrustfallRadius.md,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.background,
    alignItems: 'center',
  },
  metricVal: { fontSize: 18, fontWeight: '700', color: TrustfallColors.foreground },
  metricLbl: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
    marginTop: 4,
  },
  workRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: TrustfallSpacing.xs,
    gap: TrustfallSpacing.md,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: TrustfallRadius.md,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    overflow: 'hidden',
    backgroundColor: TrustfallColors.surface,
    flexShrink: 0,
  },
  segmentBtn: {
    paddingVertical: TrustfallSpacing.xs + 1,
    paddingHorizontal: TrustfallSpacing.md,
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(47,99,230,0.2)',
  },
  segmentLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: TrustfallColors.muted,
  },
  segmentLabelActive: {
    color: TrustfallColors.foreground,
  },
  sectionLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TrustfallColors.foreground },
  emptyInline: { paddingVertical: TrustfallSpacing.xxl, alignItems: 'center' },
  emptyBody: { fontSize: 14, color: TrustfallColors.muted },
})
