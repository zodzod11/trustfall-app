import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RequestBookingModal } from '@/components/booking/RequestBookingModal'
import { ProPortfolioCard } from '@/components/pro/ProPortfolioCard'
import { TfButton } from '@/components/ui/TfButton'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'
import { useMatchDraft } from '@/contexts/MatchDraftContext'
import { useExplorePortfolio } from '@/hooks/useExplorePortfolio'
import { buildPortfolioFeed } from '@/lib/buildPortfolioFeed'
import { useSaved } from '@/hooks/useSaved'
import { getMockProfileAvatarUrl } from '@/lib/mockProfileAvatar'
import type { MatchRequestDraft, PortfolioFeedItem, ServiceCategory } from '@/types'

const LIST_H_PADDING = TrustfallSpacing.lg * 2
const GRID_COLUMN_GAP = TrustfallSpacing.md

type ActiveTab = 'portfolio' | 'services'
type ActiveRequestService = {
  portfolioItemId: string
  portfolioImageUrl: string
  serviceTitle: string
  serviceDescription?: string
  serviceTags: string[]
}

function formatDisplayLabel(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

type ProProfileModel = {
  id: string
  displayName: string
  title: string
  category: ServiceCategory
  city: string
  rating: number
  requestCount: number
  yearsExperience: number
  about: string
  bookingPhone?: string
  bookingEmail?: string
  portfolioItems: PortfolioFeedItem[]
}

const categoryLabel: Record<ServiceCategory, string> = {
  hair: 'Hair',
  nails: 'Nails',
  makeup: 'Makeup',
  tattoo: 'Tattoo',
}

function profileAvatarUrl(name: string, id: string) {
  return getMockProfileAvatarUrl(`${id}:${name}`)
}

function buildProfessionalTagline(professional: Pick<ProProfileModel, 'category' | 'title'>) {
  switch (professional.category) {
    case 'hair':
      return 'Sharp shape, clean finishes, and styles built to grow out well.'
    case 'nails':
      return 'Detailed sets with durability, prep, and polished finishing touches.'
    case 'tattoo':
      return 'Intentional placement, readable composition, and work that ages with grace.'
    case 'makeup':
      return 'Refined glam with skin-first detail and camera-ready finish.'
    default:
      return professional.title
  }
}

function formatDuration(minutes?: number) {
  if (!minutes || minutes <= 0) return null
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins === 0 ? `${hours} hr` : `${hours} hr ${mins} min`
}

function buildRemoteProfile(id: string | undefined, items: PortfolioFeedItem[]): ProProfileModel | null {
  if (!id) return null
  const portfolioItems = items.filter((item) => item.professionalId === id)
  if (portfolioItems.length === 0) return null
  const first = portfolioItems[0]
  return {
    id: first.professionalId,
    displayName: first.professionalName,
    title: first.professionalTitle,
    category: first.category,
    city: first.location,
    rating: first.professionalRating ?? 0,
    requestCount: first.professionalRequestCount ?? 0,
    yearsExperience: first.professionalYearsExperience ?? 0,
    about: first.professionalAbout ?? '',
    bookingPhone: first.professionalPhone,
    bookingEmail: first.professionalEmail,
    portfolioItems,
  }
}

export default function ProfessionalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const routeProfessionalId = typeof id === 'string' ? id : ''
  const { width: windowWidth } = useWindowDimensions()
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid')
  const [activeTab, setActiveTab] = useState<ActiveTab>('portfolio')
  const [activeRequestService, setActiveRequestService] = useState<ActiveRequestService | null>(null)
  const { items: remoteItems, loading, error, remoteEnabled, refetch } = useExplorePortfolio()
  const { setDraft } = useMatchDraft()
  const { isProfessionalSaved, toggleProfessional, addRequestSubmission } = useSaved()
  const devSeedFeed = useMemo(() => (__DEV__ ? buildPortfolioFeed() : []), [])
  const profileFeed = __DEV__ && remoteItems.length === 0 ? devSeedFeed : remoteItems

  const remoteProfile = useMemo(
    () => buildRemoteProfile(routeProfessionalId, profileFeed),
    [profileFeed, routeProfessionalId],
  )
  const professional = remoteProfile

  const gridCellWidth = Math.max(148, Math.floor((windowWidth - LIST_H_PADDING - GRID_COLUMN_GAP) / 2))

  const serviceHighlights = useMemo(() => {
    if (!professional) return []
    return Array.from(new Set(professional.portfolioItems.flatMap((item) => item.tags))).slice(0, 4)
  }, [professional])

  const handleRequestMatch = useCallback(() => {
    if (!professional) return
    const draft: MatchRequestDraft = {
      imageName: '',
      currentPhotoName: '',
      notes: `I want to find a professional with a style similar to ${professional.displayName}.`,
      tags: serviceHighlights,
      category: professional.category,
      location: professional.city,
      refinement: {},
    }
    setDraft(draft)
    router.push('/match/results')
  }, [professional, serviceHighlights, setDraft])

  const renderPortfolioItem = useCallback(
    ({ item }: { item: PortfolioFeedItem }) => (
      <View style={viewMode === 'grid' ? [styles.gridCell, { width: gridCellWidth }] : styles.listCell}>
        <ProPortfolioCard item={item} view={viewMode} width={viewMode === 'grid' ? gridCellWidth : undefined} />
      </View>
    ),
    [gridCellWidth, viewMode],
  )

  const renderServiceItem = useCallback(
    ({ item }: { item: PortfolioFeedItem }) => {
      const serviceType = formatDisplayLabel(item.serviceType?.trim() || categoryLabel[item.category])
      const duration = formatDuration(item.durationMinutes)
      return (
        <Pressable
          style={({ pressed }) => [styles.serviceCard, pressed && styles.serviceCardPressed]}
          onPress={() =>
            setActiveRequestService({
              portfolioItemId: item.id,
              portfolioImageUrl: item.afterImageUrl || item.beforeImageUrl || '',
              serviceTitle: item.serviceTitle,
              serviceDescription: item.description,
              serviceTags: item.tags,
            })
          }
        >
          <View style={styles.serviceHeader}>
            <View style={styles.serviceHeaderText}>
              <Text style={styles.serviceTypeLabel}>{serviceType}</Text>
              <Text style={styles.serviceTitle}>{item.serviceTitle}</Text>
            </View>
            <View style={styles.servicePricePill}>
              <Text style={styles.servicePriceText}>${item.price}</Text>
            </View>
          </View>
          <View style={styles.serviceMetaRow}>
            <Text style={styles.serviceMetaText}>
              {duration ? `${duration} · ${categoryLabel[item.category]}` : categoryLabel[item.category]}
            </Text>
          </View>
          <Text style={styles.serviceDescription} numberOfLines={3}>
            {item.description?.trim() || 'Service details will appear here as this portfolio grows.'}
          </Text>
        </Pressable>
      )
    },
    [],
  )

  const keyExtractor = useCallback((item: PortfolioFeedItem) => item.id, [])

  const listHeader = useMemo(() => {
    if (!professional) return null
    const tagline = buildProfessionalTagline(professional)
    const isSaved = isProfessionalSaved(professional.id)

    return (
      <View style={styles.headerBlock}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Explore</Text>
        </Pressable>

        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.avatarWrap}>
              <Image
                source={{ uri: profileAvatarUrl(professional.displayName, professional.id) }}
                style={styles.avatarImage}
                contentFit="cover"
                transition={120}
              />
            </View>
            <View style={styles.heroTextCol}>
              <Text style={styles.eyebrow}>{categoryLabel[professional.category]}</Text>
              <Text style={styles.title}>{professional.displayName}</Text>
              <Text style={styles.sub}>
                {professional.title} · {professional.city}
              </Text>
              <Text style={styles.tagline}>{tagline}</Text>
            </View>
          </View>

          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Text style={styles.metricVal}>{professional.rating.toFixed(1)}</Text>
              <Text style={styles.metricLbl}>Rating</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricVal}>{professional.requestCount}</Text>
              <Text style={styles.metricLbl}>Requests</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricVal}>{professional.yearsExperience}</Text>
              <Text style={styles.metricLbl}>Years</Text>
            </View>
          </View>

          <View style={styles.ctaRow}>
            <TfButton title="Request Match" onPress={handleRequestMatch} style={styles.primaryCta} />
            <TfButton
              title={isSaved ? 'Saved' : 'Save Pro'}
              variant="secondary"
              size="compact"
              onPress={() => toggleProfessional(professional.id)}
              style={styles.secondaryCta}
            />
          </View>
        </View>

        <View style={styles.tabs}>
          <Pressable
            onPress={() => setActiveTab('portfolio')}
            style={[styles.tabBtn, activeTab === 'portfolio' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabLabel, activeTab === 'portfolio' && styles.tabLabelActive]}>Portfolio</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('services')}
            style={[styles.tabBtn, activeTab === 'services' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabLabel, activeTab === 'services' && styles.tabLabelActive]}>Services</Text>
          </Pressable>
        </View>

        {activeTab === 'portfolio' ? (
          <View style={styles.sectionRow}>
            <View style={styles.sectionTextCol}>
              <Text style={styles.sectionLabel}>All Work</Text>
              <Text style={styles.sectionBody}>{professional.portfolioItems.length} looks available</Text>
            </View>
            <View style={styles.segment}>
              <Pressable
                onPress={() => setViewMode('grid')}
                style={[styles.segmentBtn, viewMode === 'grid' && styles.segmentBtnActive]}
              >
                <Text style={[styles.segmentLabel, viewMode === 'grid' && styles.segmentLabelActive]}>Grid</Text>
              </Pressable>
              <Pressable
                onPress={() => setViewMode('list')}
                style={[styles.segmentBtn, viewMode === 'list' && styles.segmentBtnActive]}
              >
                <Text style={[styles.segmentLabel, viewMode === 'list' && styles.segmentLabelActive]}>List</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={[styles.sectionRow, styles.servicesSectionRow]}>
            <View style={styles.sectionTextCol}>
              <Text style={styles.sectionLabel}>Services</Text>
              <Text style={styles.sectionBody}>
                {serviceHighlights.length > 0
                  ? serviceHighlights.map(formatDisplayLabel).join(' · ')
                  : 'Pricing and service details'}
              </Text>
            </View>
          </View>
        )}
      </View>
    )
  }, [
    activeTab,
    handleRequestMatch,
    isProfessionalSaved,
    professional,
    serviceHighlights,
    toggleProfessional,
    viewMode,
  ])

  if (!professional) {
    if (loading) {
      return (
        <SafeAreaView style={styles.safe}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>
          <View style={styles.empty}>
            <ActivityIndicator color={TrustfallColors.primary} />
            <Text style={styles.emptyTitle}>Loading professional…</Text>
          </View>
        </SafeAreaView>
      )
    }

    const title = !remoteEnabled
      ? 'Catalog unavailable'
      : error
        ? 'Couldn’t load professional'
        : 'Professional not found'
    const body = !remoteEnabled
      ? 'This build is not configured for the live provider catalog yet.'
      : error
        ? error
        : 'This professional is not in the currently published live catalog.'
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
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

  const showingGrid = activeTab === 'portfolio' && viewMode === 'grid'

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={professional.portfolioItems}
        key={`${activeTab}-${viewMode}`}
        keyExtractor={keyExtractor}
        renderItem={activeTab === 'portfolio' ? renderPortfolioItem : renderServiceItem}
        numColumns={showingGrid ? 2 : 1}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={showingGrid ? styles.columnWrap : undefined}
        removeClippedSubviews={showingGrid ? false : undefined}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyInline}>
            <Text style={styles.emptyBody}>
              {activeTab === 'portfolio' ? 'No portfolio items yet.' : 'No services available yet.'}
            </Text>
          </View>
        }
      />
      {activeRequestService ? (
        <RequestBookingModal
          visible
          onClose={() => setActiveRequestService(null)}
          professionalId={professional.id}
          portfolioItemId={activeRequestService.portfolioItemId}
          portfolioImageUrl={activeRequestService.portfolioImageUrl}
          serviceTitle={activeRequestService.serviceTitle}
          serviceDescription={activeRequestService.serviceDescription}
          serviceTags={activeRequestService.serviceTags}
          categorySnapshot={professional.category}
          proName={professional.displayName}
          phoneNumber={professional.bookingPhone}
          proEmail={professional.bookingEmail}
          onSubmit={addRequestSubmission}
        />
      ) : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: TrustfallColors.background },
  listContent: {
    paddingHorizontal: TrustfallSpacing.lg,
    paddingBottom: 56,
  },
  headerBlock: {
    gap: TrustfallSpacing.md,
    paddingBottom: TrustfallSpacing.lg,
  },
  back: {
    fontSize: 14,
    fontWeight: '600',
    color: TrustfallColors.muted,
    marginBottom: TrustfallSpacing.xs,
  },
  errorText: {
    color: TrustfallColors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: '#111a30',
    padding: TrustfallSpacing.lg,
    gap: TrustfallSpacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 7,
  },
  heroTopRow: {
    flexDirection: 'row',
    gap: TrustfallSpacing.md,
    alignItems: 'center',
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: 'rgba(47, 99, 230, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(47, 99, 230, 0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: TrustfallColors.foreground,
    letterSpacing: -0.7,
  },
  sub: {
    fontSize: 16,
    color: TrustfallColors.secondary,
    lineHeight: 22,
  },
  tagline: {
    fontSize: 14,
    color: TrustfallColors.accent,
    lineHeight: 20,
  },
  metrics: {
    flexDirection: 'row',
    gap: TrustfallSpacing.sm,
  },
  metric: {
    flex: 1,
    paddingVertical: TrustfallSpacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: '#0b1326',
    alignItems: 'center',
    gap: 4,
  },
  metricVal: {
    fontSize: 20,
    fontWeight: '800',
    color: TrustfallColors.foreground,
  },
  metricLbl: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TrustfallSpacing.sm,
  },
  primaryCta: {
    flex: 1,
  },
  secondaryCta: {
    minWidth: 96,
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(47, 99, 230, 0.22)',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: TrustfallColors.muted,
  },
  tabLabelActive: {
    color: TrustfallColors.foreground,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: TrustfallSpacing.md,
  },
  servicesSectionRow: {
    paddingTop: TrustfallSpacing.xs,
    paddingBottom: TrustfallSpacing.xs,
  },
  sectionTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  sectionBody: {
    fontSize: 13,
    color: TrustfallColors.secondary,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    overflow: 'hidden',
    backgroundColor: TrustfallColors.surface,
    flexShrink: 0,
  },
  segmentBtn: {
    paddingVertical: TrustfallSpacing.sm,
    paddingHorizontal: TrustfallSpacing.md,
    minWidth: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(47,99,230,0.2)',
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: TrustfallColors.muted,
  },
  segmentLabelActive: {
    color: TrustfallColors.foreground,
  },
  columnWrap: {
    justifyContent: 'space-between',
    marginBottom: TrustfallSpacing.md,
  },
  gridCell: {
    marginBottom: TrustfallSpacing.md,
  },
  listCell: {
    width: '100%',
    marginBottom: TrustfallSpacing.md,
  },
  serviceCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
    padding: TrustfallSpacing.lg,
    marginBottom: TrustfallSpacing.md,
    gap: TrustfallSpacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  serviceCardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.99 }],
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: TrustfallSpacing.md,
  },
  serviceHeaderText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  serviceTypeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: TrustfallColors.accent,
  },
  serviceTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TrustfallColors.foreground,
    lineHeight: 22,
  },
  servicePricePill: {
    borderRadius: 999,
    backgroundColor: TrustfallColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  servicePriceText: {
    color: TrustfallColors.primaryForeground,
    fontSize: 13,
    fontWeight: '800',
  },
  serviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceMetaText: {
    color: TrustfallColors.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  serviceDescription: {
    color: TrustfallColors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TrustfallColors.foreground,
  },
  emptyInline: {
    paddingVertical: TrustfallSpacing.xxl,
    alignItems: 'center',
  },
  emptyBody: {
    fontSize: 14,
    color: TrustfallColors.muted,
  },
})
