import { Image } from 'expo-image'
import { Link, router, useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RequestBookingModal } from '@/components/booking/RequestBookingModal'
import { useMatchRunResults } from '@/hooks/useMatchRunResults'
import { TfButton } from '@/components/ui/TfButton'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'
import { useMatchDraft } from '@/contexts/MatchDraftContext'
import { useSaved } from '@/hooks/useSaved'
import { formatDisplayLabel } from '@/lib/formatDisplayLabel'
import { formatDateDisplay, formatTimeDisplay } from '@/lib/match/refinementFormat'
import { toDialablePhoneNumber } from '@/lib/phone'
import type { MatchResultsRankedProfessional } from '@/types'

type RequestTarget = MatchResultsRankedProfessional & {
  portfolioImageUrl: string
  serviceTitle: string
  scoreLabel: string
}

export default function MatchResultsScreen() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const params = useLocalSearchParams<{ request?: string | string[] }>()
  const matchRequestId =
    typeof params.request === 'string'
      ? params.request
      : Array.isArray(params.request)
        ? params.request[0]
        : undefined
  const { draft, hydrated } = useMatchDraft()
  const request = hydrated ? draft ?? undefined : undefined
  const {
    ranked,
    status: matchRunStatus,
    isPending,
    errorMessage: matchRunError,
  } = useMatchRunResults(matchRequestId)
  const desiredTimePrefill = useMemo(() => {
    if (!request) return ''
    const dateLabel = formatDateDisplay(request.refinement.date)
    const timeLabel = formatTimeDisplay(request.refinement.time)
    const parts = [dateLabel, timeLabel].filter((value) => value && value !== '—')
    return parts.join(' · ')
  }, [request])
  const [activeTarget, setActiveTarget] = useState<RequestTarget | null>(null)
  const [piecePreview, setPiecePreview] = useState<{
    ranked: MatchResultsRankedProfessional
    portfolioItemId: string
  } | null>(null)
  const { addRequestSubmission } = useSaved()
  const [selectedPieceByProId, setSelectedPieceByProId] = useState<Record<string, string>>({})
  const missingRequest = !matchRequestId

  const previewPiece = useMemo(() => {
    if (!piecePreview) return null
    return (
      piecePreview.ranked.matchedPieces.find((p) => p.id === piecePreview.portfolioItemId) ??
      piecePreview.ranked.matchedPieces[0] ??
      null
    )
  }, [piecePreview])

  const modalCardInnerW = Math.min(windowWidth - TrustfallSpacing.lg * 2, 520) - TrustfallSpacing.lg * 2
  const modalCompareGap = TrustfallSpacing.sm
  const modalColW = Math.max(72, (modalCardInnerW - modalCompareGap) / 2)
  /** Side-by-side pair in modal — same idea as Explore (no scroll between after/before). */
  const modalPairHeight = Math.min(
    Math.round(modalColW * 1.22),
    Math.round(windowHeight * 0.32),
    260,
  )
  const modalSingleImageHeight = Math.min(Math.round(windowHeight * 0.36), 320)

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.eyebrow}>Matches</Text>
        <Text style={styles.title}>
          {!hydrated ? 'Loading your request…' : isPending ? 'Finding your matches…' : 'Results'}
        </Text>
        <Text style={styles.desc}>
          {!hydrated
            ? 'Restoring your last saved match request.'
            : isPending
            ? 'Comparing style tags, category, and location to rank the best fits.'
            : request
              ? 'Ranked from your request.'
              : 'We could not find an active match request for this screen.'}
        </Text>

        {!hydrated && (
          <View style={styles.empty}>
            <ActivityIndicator color={TrustfallColors.primary} />
            <Text style={styles.emptyBody}>Loading your request from this device…</Text>
          </View>
        )}

        {hydrated && isPending && (
          <View style={styles.skeletonStack}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonCard}>
                <View style={styles.skeletonThumb} />
                <View style={styles.skeletonLines}>
                  <View style={styles.skeletonLineLg} />
                  <View style={styles.skeletonLineSm} />
                  <View style={styles.skeletonLineMd} />
                </View>
              </View>
            ))}
          </View>
        )}

        {hydrated && missingRequest ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No submitted request found</Text>
            <Text style={styles.emptyBody}>
              This screen needs a live match request. Start a new request to see personalized results.
            </Text>
            <TfButton title="Start match request" onPress={() => router.replace('/match')} />
          </View>
        ) : null}

        {matchRunError && !isPending ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{matchRunError}</Text>
            <TfButton title="Update request" onPress={() => router.replace('/match')} />
          </View>
        ) : null}

        {!isPending && request && (
          <View style={styles.summary}>
            <Text style={styles.summaryEyebrow}>Request</Text>
            <Text style={styles.summaryText}>
              {request.category ? formatDisplayLabel(request.category) : 'Any'} · {request.location || 'Any area'}
            </Text>
            {request.tags.length > 0 ? (
              <View style={styles.tagRow}>
                {request.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{formatDisplayLabel(tag)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {(request.inspirationUri || request.currentPhotoUri) ? (
              <View style={styles.requestPhotoRow}>
                {request.inspirationUri ? (
                  <View style={styles.requestPhotoCol}>
                    <Text style={styles.requestPhotoLabel}>Inspiration</Text>
                    <Image
                      source={{ uri: request.inspirationUri }}
                      style={styles.requestPhotoImg}
                      contentFit="cover"
                    />
                  </View>
                ) : null}
                {request.currentPhotoUri ? (
                  <View style={styles.requestPhotoCol}>
                    <Text style={styles.requestPhotoLabel}>Your photo</Text>
                    <Image
                      source={{ uri: request.currentPhotoUri }}
                      style={styles.requestPhotoImg}
                      contentFit="cover"
                    />
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        )}

        {!isPending &&
          !missingRequest &&
          !matchRunError &&
          ranked.map((item, i) => {
            const selectedPieceId = selectedPieceByProId[item.id]
            const selectedPiece =
              item.matchedPieces.find((p) => p.id === selectedPieceId) ?? item.matchedPieces[0]
            const portfolioImageUrl = selectedPiece?.imageUrl ?? item.portfolioImageUrl
            const selectedServiceTitle = selectedPiece?.serviceTitle ?? item.serviceTitle
            const selectedPortfolioItemId = selectedPiece?.id ?? item.portfolioItemId
            const selectedScoreLabel = selectedPiece?.scoreLabel ?? item.scoreLabel

            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <Pressable
                    onPress={() =>
                      setPiecePreview({ ranked: item, portfolioItemId: selectedPortfolioItemId })
                    }
                    style={styles.thumbWrap}
                  >
                    <Image source={{ uri: portfolioImageUrl }} style={styles.thumb} />
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>{i + 1}</Text>
                    </View>
                  </Pressable>
                  <View style={styles.cardBody}>
                    <View style={styles.nameRow}>
                      <Link href={`/pro/${item.id}`} asChild>
                        <Pressable>
                          <Text style={styles.proName}>{item.name}</Text>
                        </Pressable>
                      </Link>
                      <Text style={styles.score}>{selectedScoreLabel}</Text>
                    </View>
                    <Text style={styles.subLine}>
                      {item.title} · {item.city}
                    </Text>
                    <Text style={styles.mutedLine} numberOfLines={1}>
                      Best look: {selectedServiceTitle}
                    </Text>
                    <Pressable
                      onPress={() =>
                        setPiecePreview({ ranked: item, portfolioItemId: selectedPortfolioItemId })
                      }
                    >
                      <Text style={styles.link}>Review this look</Text>
                    </Pressable>
                    <Text style={styles.rating}>{item.rating.toFixed(1)} rating</Text>
                    <View style={styles.tagRow}>
                      {item.labels.map((l) => (
                        <View key={l} style={styles.tag}>
                          <Text style={styles.tagText}>{formatDisplayLabel(l)}</Text>
                        </View>
                      ))}
                    </View>
                    {item.matchedPieces.length > 1 ? (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.pieceScroll}
                      >
                        {item.matchedPieces.map((piece) => {
                          const active = piece.id === selectedPortfolioItemId
                          return (
                            <Pressable
                              key={piece.id}
                              onPress={() =>
                                setSelectedPieceByProId((c) => ({ ...c, [item.id]: piece.id }))
                              }
                              style={[styles.pieceThumb, active && styles.pieceThumbOn]}
                            >
                              <Image source={{ uri: piece.imageUrl }} style={styles.pieceImg} />
                            </Pressable>
                          )
                        })}
                      </ScrollView>
                    ) : null}
                    <View style={styles.ctaBlock}>
                      <TfButton
                        title="Request"
                        titleNumberOfLines={1}
                        style={{ ...styles.ctaBtnBase, ...styles.ctaBtnRequestFull }}
                        textStyle={styles.ctaBtnLabelRequest}
                        onPress={() =>
                          setActiveTarget({
                            ...item,
                            portfolioItemId: selectedPortfolioItemId,
                            portfolioImageUrl,
                            serviceTitle: selectedServiceTitle,
                            scoreLabel: selectedScoreLabel,
                          })
                        }
                      />
                      <View style={styles.ctaRowSub}>
                        <TfButton
                          title="Call"
                          variant="secondary"
                          style={{ ...styles.ctaBtnBase, ...styles.ctaBtnContactHalf }}
                          textStyle={styles.ctaBtnLabelContact}
                          onPress={() => void Linking.openURL(`tel:${toDialablePhoneNumber(item.phoneNumber)}`)}
                        />
                        <TfButton
                          title="Text"
                          variant="secondary"
                          style={{ ...styles.ctaBtnBase, ...styles.ctaBtnContactHalf }}
                          textStyle={styles.ctaBtnLabelContact}
                          onPress={() => void Linking.openURL(`sms:${toDialablePhoneNumber(item.phoneNumber)}`)}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )
          })}

        {!missingRequest &&
        !isPending &&
        !matchRunError &&
        matchRunStatus === 'ready' &&
        ranked.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptyBody}>
              Try widening your area, clearing a few style tags, or adjusting your inspiration notes.
            </Text>
            <Link href="/match" asChild>
              <Pressable style={styles.emptyCta}>
                <Text style={styles.link}>Update request</Text>
              </Pressable>
            </Link>
          </View>
        ) : null}

        <Link href="/match" asChild>
          <Pressable style={styles.backLink}>
            <Text style={styles.mutedLine}>← Adjust preferences</Text>
          </Pressable>
        </Link>
      </ScrollView>

      <Modal visible={piecePreview !== null} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setPiecePreview(null)}>
          {piecePreview && previewPiece ? (
            <View
              style={[styles.modalCard, { maxHeight: windowHeight * 0.92 }]}
              onStartShouldSetResponder={() => true}
            >
              <ScrollView
                bounces={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.modalTitle}>{previewPiece.serviceTitle}</Text>
                {previewPiece.beforeImageUrl ? (
                  <View style={styles.modalCompareRow}>
                    <View style={styles.modalCompareCol}>
                      <Text style={styles.modalEyebrow}>Before</Text>
                      <View style={[styles.modalImageViewport, { height: modalPairHeight }]}>
                        <Image
                          source={{ uri: previewPiece.beforeImageUrl }}
                          style={StyleSheet.absoluteFill}
                          contentFit="contain"
                          accessibilityLabel="Before, full image"
                          transition={180}
                        />
                      </View>
                    </View>
                    <View style={styles.modalCompareCol}>
                      <Text style={styles.modalEyebrow}>After</Text>
                      <View style={[styles.modalImageViewport, { height: modalPairHeight }]}>
                        <Image
                          source={{ uri: previewPiece.imageUrl }}
                          style={StyleSheet.absoluteFill}
                          contentFit="contain"
                          accessibilityLabel="After, full image"
                          transition={180}
                        />
                      </View>
                    </View>
                  </View>
                ) : (
                  <>
                    <Text style={styles.modalEyebrow}>Portfolio</Text>
                    <View style={[styles.modalImageViewport, { height: modalSingleImageHeight }]}>
                      <Image
                        source={{ uri: previewPiece.imageUrl }}
                        style={StyleSheet.absoluteFill}
                        contentFit="contain"
                        accessibilityLabel="Portfolio image"
                        transition={180}
                      />
                    </View>
                  </>
                )}
                <TfButton
                  title="Open full portfolio"
                  variant="secondary"
                  onPress={() => {
                    const id = piecePreview.portfolioItemId
                    setPiecePreview(null)
                    router.push(`/explore/${id}`)
                  }}
                />
                <TfButton title="Close" variant="secondary" onPress={() => setPiecePreview(null)} />
                <TfButton
                  title="Request this look"
                  textStyle={styles.modalPrimaryBtnLabel}
                  onPress={() => {
                    const r = piecePreview.ranked
                    const pid = piecePreview.portfolioItemId
                    const p = r.matchedPieces.find((x) => x.id === pid) ?? r.matchedPieces[0]
                    setActiveTarget({
                      ...r,
                      portfolioItemId: p.id,
                      portfolioImageUrl: p.imageUrl,
                      serviceTitle: p.serviceTitle,
                      scoreLabel: p.scoreLabel,
                    })
                    setPiecePreview(null)
                  }}
                />
              </ScrollView>
            </View>
          ) : null}
        </Pressable>
      </Modal>

      {activeTarget ? (
        <RequestBookingModal
          visible={Boolean(activeTarget)}
          onClose={() => setActiveTarget(null)}
          professionalId={activeTarget.id}
          portfolioItemId={activeTarget.portfolioItemId}
          portfolioImageUrl={activeTarget.portfolioImageUrl}
          serviceTitle={activeTarget.serviceTitle}
          categorySnapshot={request?.category}
          proName={activeTarget.name}
          phoneNumber={activeTarget.phoneNumber}
          proEmail={activeTarget.proEmail}
          requestType="match"
          matchRequestId={matchRequestId}
          initialPreferredDate={desiredTimePrefill}
          initialInspirationName={request?.imageName ?? ''}
          initialCurrentPhotoName={request?.currentPhotoName ?? ''}
          initialInspirationUri={request?.inspirationUri}
          initialCurrentPhotoUri={request?.currentPhotoUri}
          onSubmit={addRequestSubmission}
        />
      ) : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: TrustfallColors.background },
  scroll: { padding: TrustfallSpacing.lg, paddingBottom: 48, gap: TrustfallSpacing.lg },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  title: { fontSize: 28, fontWeight: '700', color: TrustfallColors.foreground },
  desc: { fontSize: 14, color: TrustfallColors.muted, lineHeight: 20 },
  errorCard: {
    gap: TrustfallSpacing.md,
    padding: TrustfallSpacing.lg,
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  errorText: { fontSize: 13, lineHeight: 20, color: TrustfallColors.foreground },
  skeletonStack: { gap: TrustfallSpacing.md },
  skeletonCard: {
    flexDirection: 'row',
    gap: TrustfallSpacing.md,
    padding: TrustfallSpacing.lg,
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
  },
  skeletonThumb: {
    width: 110,
    height: 128,
    borderRadius: TrustfallRadius.lg,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  skeletonLines: { flex: 1, gap: 8, justifyContent: 'center' },
  skeletonLineLg: { height: 14, borderRadius: 4, backgroundColor: TrustfallColors.surfaceElevated, width: '70%' },
  skeletonLineSm: { height: 12, borderRadius: 4, backgroundColor: TrustfallColors.surfaceElevated, width: '45%' },
  skeletonLineMd: { height: 12, borderRadius: 4, backgroundColor: TrustfallColors.surfaceElevated, width: '85%' },
  summary: {
    padding: TrustfallSpacing.lg,
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
    gap: TrustfallSpacing.sm,
  },
  summaryEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  summaryText: { fontSize: 14, color: TrustfallColors.secondary },
  requestPhotoRow: { flexDirection: 'row', gap: TrustfallSpacing.md, marginTop: TrustfallSpacing.sm },
  requestPhotoCol: { flex: 1, minWidth: 0, gap: 6 },
  requestPhotoLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  requestPhotoImg: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: TrustfallRadius.md,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: TrustfallSpacing.sm },
  tag: {
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    borderRadius: 999,
    paddingHorizontal: TrustfallSpacing.sm,
    paddingVertical: 4,
  },
  tagText: { fontSize: 10, fontWeight: '700', color: TrustfallColors.foreground },
  card: {
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
    overflow: 'hidden',
  },
  cardRow: { flexDirection: 'row', gap: TrustfallSpacing.md, padding: TrustfallSpacing.lg },
  thumbWrap: { width: 112, borderRadius: TrustfallRadius.lg, overflow: 'hidden' },
  thumb: { width: 112, height: 128, backgroundColor: TrustfallColors.surfaceElevated },
  rankBadge: {
    position: 'absolute',
    left: 8,
    top: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(11,19,38,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: 12, fontWeight: '700', color: TrustfallColors.accent },
  cardBody: { flex: 1, minWidth: 0, alignSelf: 'stretch', gap: 4 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' },
  proName: { fontSize: 17, fontWeight: '700', color: TrustfallColors.foreground, flex: 1 },
  score: { fontSize: 11, fontWeight: '800', color: TrustfallColors.accent, textTransform: 'uppercase' },
  subLine: { fontSize: 14, color: TrustfallColors.secondary },
  mutedLine: { fontSize: 12, color: TrustfallColors.muted },
  link: { fontSize: 12, fontWeight: '700', color: TrustfallColors.accent, marginTop: 4 },
  rating: { fontSize: 12, color: TrustfallColors.muted },
  pieceThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: TrustfallColors.border,
  },
  pieceThumbOn: { borderColor: TrustfallColors.primary, borderWidth: 2 },
  pieceImg: { width: '100%', height: '100%' },
  pieceScroll: {
    maxWidth: '100%',
    flexGrow: 0,
  },
  /** Full-width Request + Call/Text row — narrow card column can’t fit three inline CTAs without truncating. */
  ctaBlock: {
    alignSelf: 'stretch',
    width: '100%',
    gap: TrustfallSpacing.sm,
    marginTop: TrustfallSpacing.sm,
  },
  ctaRowSub: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: TrustfallSpacing.xs,
    alignItems: 'stretch',
  },
  ctaBtnBase: {
    paddingVertical: TrustfallSpacing.sm,
    justifyContent: 'center',
  },
  ctaBtnRequestFull: {
    alignSelf: 'stretch',
    width: '100%',
    minHeight: 50,
    paddingHorizontal: TrustfallSpacing.lg,
  },
  ctaBtnContactHalf: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    paddingHorizontal: TrustfallSpacing.sm,
  },
  ctaBtnLabelRequest: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  ctaBtnLabelContact: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.25,
  },
  empty: { padding: TrustfallSpacing.xxl, alignItems: 'center', gap: TrustfallSpacing.md },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: TrustfallColors.foreground },
  emptyBody: { fontSize: 14, color: TrustfallColors.muted, textAlign: 'center' },
  emptyCta: { paddingVertical: TrustfallSpacing.xs },
  footerNote: { textAlign: 'center', fontSize: 12, color: TrustfallColors.muted },
  backLink: { alignItems: 'center', paddingBottom: 24 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: TrustfallSpacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: TrustfallColors.surface,
    borderRadius: TrustfallRadius.xl,
    padding: TrustfallSpacing.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
  },
  modalScrollContent: {
    gap: TrustfallSpacing.md,
    paddingBottom: TrustfallSpacing.sm,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: TrustfallColors.foreground },
  modalCompareRow: {
    flexDirection: 'row',
    gap: TrustfallSpacing.sm,
    alignItems: 'flex-start',
  },
  modalCompareCol: { flex: 1, minWidth: 0, gap: TrustfallSpacing.xs },
  modalEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  modalImageViewport: {
    width: '100%',
    borderRadius: TrustfallRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#080c18',
  },
  modalPrimaryBtnLabel: { fontSize: 16, fontWeight: '800' },
})
