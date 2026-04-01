import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PortfolioCard } from '@/components/explore/PortfolioCard'
import { TrustfallBrandMark, TrustfallScreenHeader } from '@/components/layout/TrustfallScreenHeader'
import { STORAGE_RECENT_SEARCHES_V1 } from '@/constants/storage-keys'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'
import { useExplorePortfolio } from '@/hooks/useExplorePortfolio'
import { onboardingApi } from '@/lib/onboarding'
import { buildPortfolioFeed } from '@/lib/buildPortfolioFeed'
import { useExplorePersonalization } from '../../../../src/hooks/useExplorePersonalization'
import { orderExploreByPersonalization } from '../../../../src/lib/explore/orderExploreByPersonalization'
import type { PortfolioFeedItem, ServiceCategory } from '@/types'

const SUGGESTED = ['Low taper fade', 'Soft glam makeup', 'Natural braids']

const LIST_H_PADDING = TrustfallSpacing.lg * 2
const GRID_COLUMN_GAP = TrustfallSpacing.md

export default function ExploreScreen() {
  const { width: windowWidth } = useWindowDimensions()
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>('all')
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [selectedTag, setSelectedTag] = useState('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const seedFeed = useMemo(() => buildPortfolioFeed(), [])
  const { items: remoteItems, remoteEnabled, refetch } = useExplorePortfolio()
  const portfolioFeed = remoteEnabled && remoteItems.length > 0 ? remoteItems : seedFeed

  const categories = useMemo(
    () =>
      Array.from(new Set(portfolioFeed.map((item) => item.category))) as ServiceCategory[],
    [portfolioFeed],
  )
  const locations = useMemo(
    () => Array.from(new Set(portfolioFeed.map((item) => item.location))).sort(),
    [portfolioFeed],
  )
  const tags = useMemo(
    () => Array.from(new Set(portfolioFeed.flatMap((item) => item.tags))).sort(),
    [portfolioFeed],
  )

  const explorePersonalization = useExplorePersonalization({
    portfolioFeed,
    catalogCategories: categories,
    catalogLocations: locations,
    catalogTags: tags,
    api: onboardingApi,
  })

  const exploreDefaultsAppliedRef = useRef(false)
  useEffect(() => {
    if (explorePersonalization.status !== 'ready' || portfolioFeed.length === 0) return
    if (exploreDefaultsAppliedRef.current) return
    exploreDefaultsAppliedRef.current = true
    setSelectedCategory(explorePersonalization.suggestedFilters.category)
    setSelectedLocation(explorePersonalization.suggestedFilters.location)
    setSelectedTag(explorePersonalization.suggestedFilters.tag)
  }, [explorePersonalization.status, explorePersonalization.suggestedFilters, portfolioFeed.length])

  const filteredItems = useMemo(
    () =>
      portfolioFeed.filter((item) => {
        if (selectedCategory !== 'all' && item.category !== selectedCategory) return false
        if (selectedLocation !== 'all' && item.location !== selectedLocation) return false
        if (selectedTag !== 'all' && !item.tags.includes(selectedTag)) return false
        return true
      }),
    [portfolioFeed, selectedCategory, selectedLocation, selectedTag],
  )

  const orderedForDisplay = useMemo(
    () => orderExploreByPersonalization(filteredItems, explorePersonalization.prefs),
    [filteredItems, explorePersonalization.prefs],
  )

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return orderedForDisplay
    return orderedForDisplay.filter((item) => {
      const hay = [
        item.serviceTitle,
        item.professionalName,
        item.professionalTitle,
        item.location,
        item.category,
        ...item.tags,
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [orderedForDisplay, searchQuery])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }, [refetch])

  const saveRecent = useCallback(async (term: string) => {
    const n = term.trim()
    if (!n) return
    const next = [n, ...recentSearches.filter((x) => x !== n)].slice(0, 6)
    setRecentSearches(next)
    await AsyncStorage.setItem(STORAGE_RECENT_SEARCHES_V1, JSON.stringify(next))
  }, [recentSearches])

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_RECENT_SEARCHES_V1).then((raw) => {
      if (!raw) return
      try {
        const parsed = JSON.parse(raw) as string[]
        setRecentSearches(parsed.slice(0, 6))
      } catch {
        /* ignore */
      }
    })
  }, [])

  const data = searchResults

  /** Explicit width avoids flex/% bugs in 2-col FlatList (images collapsing or wrong size on web/device). */
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

  const filterSummary = useMemo(() => {
    const parts: string[] = []
    if (selectedCategory !== 'all') parts.push(selectedCategory)
    if (selectedLocation !== 'all') parts.push(selectedLocation)
    if (selectedTag !== 'all') parts.push(selectedTag)
    return parts.length > 0 ? parts.join(' · ') : 'All categories & locations'
  }, [selectedCategory, selectedLocation, selectedTag])

  const hasActiveFilters =
    selectedCategory !== 'all' || selectedLocation !== 'all' || selectedTag !== 'all'

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TrustfallScreenHeader
        title="Explore"
        subtitle="Style-first discovery"
        left={<TrustfallBrandMark />}
        right={
          <Pressable style={styles.searchToggle} onPress={() => setSearchOpen((o) => !o)}>
            <Text style={styles.searchToggleText}>{searchOpen ? 'Done' : 'Search'}</Text>
          </Pressable>
        }
      />

      {searchOpen ? (
        <View style={styles.searchBlock}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => saveRecent(searchQuery)}
            placeholder="Search looks, pros, tags..."
            placeholderTextColor={TrustfallColors.muted}
            style={styles.searchInput}
            returnKeyType="search"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.prompts}>
            {SUGGESTED.map((p) => (
              <Pressable key={p} onPress={() => setSearchQuery(p)} style={styles.promptChip}>
                <Text style={styles.promptText}>{p}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {recentSearches.length > 0 ? (
            <Text style={styles.recentLabel}>Recent</Text>
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {recentSearches.map((r) => (
              <Pressable key={r} onPress={() => setSearchQuery(r)} style={styles.recentChip}>
                <Text style={styles.recentText}>{r}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {explorePersonalization.hint ? (
        <Text style={styles.personalizationHint}>{explorePersonalization.hint}</Text>
      ) : null}

      {/* View mode: compact toggle, right-aligned */}
      <View style={styles.viewModeRow}>
        <Text style={styles.viewModeLabel}>View</Text>
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

      <View style={styles.filtersOuter}>
        <Pressable
          style={styles.filtersTrigger}
          onPress={() => setFiltersOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityLabel={filtersOpen ? 'Hide filters' : 'Show filters'}
        >
          <View style={styles.filtersTriggerTextCol}>
            <View style={styles.filtersTriggerTitleRow}>
              <Text style={styles.filtersTriggerTitle}>Filters</Text>
              {hasActiveFilters ? <View style={styles.filterActiveDot} /> : null}
            </View>
            <Text style={styles.filtersTriggerSummary} numberOfLines={1}>
              {filterSummary}
            </Text>
          </View>
          <Text style={styles.chevron}>{filtersOpen ? '▾' : '▸'}</Text>
        </Pressable>

        {filtersOpen ? (
          <View style={styles.filtersDropdown}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabelInPanel}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScrollContentPanel}
              >
                <Pressable
                  onPress={() => setSelectedCategory('all')}
                  style={[styles.filterChip, selectedCategory === 'all' && styles.filterChipOn]}
                >
                  <Text style={[styles.filterText, selectedCategory === 'all' && styles.filterTextOn]}>
                    All
                  </Text>
                </Pressable>
                {categories.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setSelectedCategory(c)}
                    style={[styles.filterChip, selectedCategory === c && styles.filterChipOn]}
                  >
                    <Text style={[styles.filterText, selectedCategory === c && styles.filterTextOn]}>{c}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabelInPanel}>City</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScrollContentPanel}
              >
                <Pressable
                  onPress={() => setSelectedLocation('all')}
                  style={[styles.filterChip, selectedLocation === 'all' && styles.filterChipOn]}
                >
                  <Text style={[styles.filterText, selectedLocation === 'all' && styles.filterTextOn]}>
                    All
                  </Text>
                </Pressable>
                {locations.map((loc) => (
                  <Pressable
                    key={loc}
                    onPress={() => setSelectedLocation(loc)}
                    style={[styles.filterChip, selectedLocation === loc && styles.filterChipOn]}
                  >
                    <Text style={[styles.filterText, selectedLocation === loc && styles.filterTextOn]}>
                      {loc}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabelInPanel}>Style tags</Text>
              <View style={styles.tagWrapPanel}>
                <Pressable
                  onPress={() => setSelectedTag('all')}
                  style={[styles.tagChip, selectedTag === 'all' && styles.tagChipOn]}
                >
                  <Text style={[styles.tagChipText, selectedTag === 'all' && styles.tagChipTextOn]}>All</Text>
                </Pressable>
                {tags.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setSelectedTag((cur) => (cur === t ? 'all' : t))}
                    style={[styles.tagChip, selectedTag === t && styles.tagChipOn]}
                  >
                    <Text style={[styles.tagChipText, selectedTag === t && styles.tagChipTextOn]}>{t}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        ) : null}
      </View>

      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode}
        removeClippedSubviews={viewMode === 'grid' ? false : undefined}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={viewMode === 'grid' ? styles.columnWrap : undefined}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TrustfallColors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No looks match</Text>
            <Text style={styles.emptyBody}>Try widening filters or clearing search.</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: TrustfallColors.background },
  searchToggle: {
    paddingHorizontal: TrustfallSpacing.md,
    paddingVertical: TrustfallSpacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(47,99,230,0.1)',
  },
  searchToggleText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3, color: TrustfallColors.primary },
  searchBlock: {
    paddingHorizontal: TrustfallSpacing.lg,
    paddingBottom: TrustfallSpacing.md,
    gap: TrustfallSpacing.sm,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    borderRadius: TrustfallRadius.lg,
    padding: TrustfallSpacing.lg,
    fontSize: 16,
    color: TrustfallColors.foreground,
    backgroundColor: TrustfallColors.surface,
  },
  prompts: { paddingVertical: 4 },
  promptChip: {
    marginRight: TrustfallSpacing.sm,
    paddingHorizontal: TrustfallSpacing.lg,
    paddingVertical: TrustfallSpacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  promptText: { fontSize: 13, color: TrustfallColors.secondary },
  recentLabel: { fontSize: 11, fontWeight: '700', color: TrustfallColors.muted, textTransform: 'uppercase' },
  recentChip: {
    marginRight: TrustfallSpacing.sm,
    paddingHorizontal: TrustfallSpacing.md,
    paddingVertical: TrustfallSpacing.xs,
    borderRadius: TrustfallRadius.md,
    backgroundColor: 'rgba(47,99,230,0.12)',
  },
  recentText: { fontSize: 12, color: TrustfallColors.accent },
  personalizationHint: {
    paddingHorizontal: TrustfallSpacing.lg,
    paddingBottom: TrustfallSpacing.sm,
    fontSize: 12,
    lineHeight: 18,
    color: TrustfallColors.muted,
  },
  viewModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: TrustfallSpacing.lg,
    marginBottom: TrustfallSpacing.md,
  },
  viewModeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  filtersOuter: {
    paddingHorizontal: TrustfallSpacing.lg,
    marginBottom: TrustfallSpacing.md,
  },
  filtersTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: TrustfallSpacing.md,
    paddingVertical: TrustfallSpacing.md,
    paddingHorizontal: TrustfallSpacing.lg,
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
  },
  filtersTriggerTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  filtersTriggerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TrustfallSpacing.sm,
  },
  filtersTriggerTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  filtersTriggerSummary: {
    fontSize: 13,
    fontWeight: '600',
    color: TrustfallColors.secondary,
  },
  filterActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TrustfallColors.primary,
  },
  filtersDropdown: {
    marginTop: TrustfallSpacing.sm,
    padding: TrustfallSpacing.lg,
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: 'rgba(23,31,51,0.85)',
    gap: TrustfallSpacing.lg,
  },
  filterSection: {
    gap: TrustfallSpacing.sm,
  },
  filterSectionLabelInPanel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  filterScrollContentPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: TrustfallSpacing.lg,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: TrustfallRadius.md,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    overflow: 'hidden',
    backgroundColor: TrustfallColors.surface,
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
  filterChip: {
    marginRight: TrustfallSpacing.sm,
    paddingHorizontal: TrustfallSpacing.lg,
    paddingVertical: TrustfallSpacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
  },
  filterChipOn: {
    borderColor: TrustfallColors.primary,
    backgroundColor: 'rgba(47,99,230,0.2)',
  },
  filterText: { fontSize: 13, fontWeight: '600', color: TrustfallColors.muted, textTransform: 'capitalize' },
  filterTextOn: { color: TrustfallColors.foreground },
  chevron: {
    fontSize: 14,
    color: TrustfallColors.muted,
    fontWeight: '700',
  },
  tagWrapPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TrustfallSpacing.sm,
  },
  tagChip: {
    paddingHorizontal: TrustfallSpacing.md,
    paddingVertical: TrustfallSpacing.sm,
    borderRadius: TrustfallRadius.md,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  tagChipOn: {
    borderColor: TrustfallColors.primary,
    backgroundColor: 'rgba(47,99,230,0.18)',
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: TrustfallColors.secondary,
    textTransform: 'lowercase',
  },
  tagChipTextOn: {
    color: TrustfallColors.foreground,
  },
  listContent: { paddingHorizontal: TrustfallSpacing.lg, paddingBottom: 100, gap: TrustfallSpacing.lg },
  columnWrap: {
    justifyContent: 'space-between',
    marginBottom: TrustfallSpacing.sm,
  },
  gridCell: {
    marginBottom: TrustfallSpacing.sm,
  },
  listCell: { width: '100%' },
  empty: { padding: TrustfallSpacing.xxl, alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: TrustfallColors.foreground },
  emptyBody: { fontSize: 14, color: TrustfallColors.muted, textAlign: 'center', marginTop: 8 },
})
