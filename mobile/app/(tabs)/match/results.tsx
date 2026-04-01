import { Image } from 'expo-image'
import { Link } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RequestBookingModal } from '@/components/booking/RequestBookingModal'
import { TfButton } from '@/components/ui/TfButton'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'
import { useMatchDraft } from '@/contexts/MatchDraftContext'
import { rankProfessionals } from '@/features/matching/rankProfessionals'
import { useSaved } from '@/hooks/useSaved'
import { buildMatchRequestPrefillMessage } from '@/utils/matchRequestPrefill'
import type { MatchResultsRankedProfessional } from '@/types'

type RequestTarget = MatchResultsRankedProfessional & {
  portfolioImageUrl: string
  serviceTitle: string
  scoreLabel: string
}

export default function MatchResultsScreen() {
  const { draft } = useMatchDraft()
  const request = draft ?? undefined
  const [pending, setPending] = useState(true)
  const [activeTarget, setActiveTarget] = useState<RequestTarget | null>(null)
  const [piecePreview, setPiecePreview] = useState<{
    ranked: MatchResultsRankedProfessional
    portfolioItemId: string
  } | null>(null)
  const { requestSubmissions, addRequestSubmission } = useSaved()
  const [selectedPieceByProId, setSelectedPieceByProId] = useState<Record<string, string>>({})

  const ranked = useMemo(() => rankProfessionals(request), [request])

  useEffect(() => {
    const t = setTimeout(() => setPending(false), 1200)
    return () => clearTimeout(t)
  }, [])

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.eyebrow}>Matches</Text>
        <Text style={styles.title}>
          {pending ? 'Finding your matches…' : 'Results'}
        </Text>
        <Text style={styles.desc}>
          {pending
            ? 'Comparing style tags, category, and location.'
            : request
              ? 'Ranked from your request.'
              : 'Sample ranking — submit a match request for personalized results.'}
        </Text>

        {pending && (
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

        {!pending && request && (
          <View style={styles.summary}>
            <Text style={styles.summaryEyebrow}>Request</Text>
            <Text style={styles.summaryText}>
              {request.category || 'Any'} · {request.location || 'Any area'}
            </Text>
            {request.tags.length > 0 ? (
              <View style={styles.tagRow}>
                {request.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
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

        {!pending &&
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
                          <Text style={styles.tagText}>{l}</Text>
                        </View>
                      ))}
                    </View>
                    {item.matchedPieces.length > 1 ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                    <View style={styles.ctaRow}>
                      <TfButton
                        title="Request"
                        style={styles.ctaBtn}
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
                      <TfButton
                        title="Call"
                        variant="secondary"
                        style={styles.ctaBtn}
                        onPress={() => void Linking.openURL(`tel:${item.phoneNumber}`)}
                      />
                      <TfButton
                        title="Text"
                        variant="secondary"
                        style={styles.ctaBtn}
                        onPress={() => void Linking.openURL(`sms:${item.phoneNumber}`)}
                      />
                    </View>
                  </View>
                </View>
              </View>
            )
          })}

        {!pending && ranked.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Link href="/match" asChild>
              <Pressable>
                <Text style={styles.link}>Update request</Text>
              </Pressable>
            </Link>
          </View>
        ) : null}

        {!pending && requestSubmissions.length > 0 ? (
          <Text style={styles.footerNote}>
            {requestSubmissions.length} request(s) saved on this device.
          </Text>
        ) : null}

        <Link href="/match" asChild>
          <Pressable style={styles.backLink}>
            <Text style={styles.mutedLine}>← Adjust preferences</Text>
          </Pressable>
        </Link>
      </ScrollView>

      <Modal visible={piecePreview !== null} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setPiecePreview(null)}>
          {piecePreview ? (
            <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>
                {piecePreview.ranked.matchedPieces.find((p) => p.id === piecePreview.portfolioItemId)
                  ?.serviceTitle ?? 'Portfolio'}
              </Text>
              <Image
                source={{
                  uri:
                    piecePreview.ranked.matchedPieces.find((p) => p.id === piecePreview.portfolioItemId)
                      ?.imageUrl ?? '',
                }}
                style={styles.modalImg}
              />
              <TfButton title="Close" variant="secondary" onPress={() => setPiecePreview(null)} />
              <TfButton
                title="Request this look"
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
          proName={activeTarget.name}
          phoneNumber={activeTarget.phoneNumber}
          proEmail={activeTarget.proEmail}
          initialMessage={buildMatchRequestPrefillMessage(request)}
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
  tagText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: TrustfallColors.foreground },
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
  cardBody: { flex: 1, minWidth: 0, gap: 4 },
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
  ctaRow: { flexDirection: 'row', gap: TrustfallSpacing.sm, marginTop: TrustfallSpacing.sm },
  ctaBtn: { flex: 1, minWidth: 0 },
  empty: { padding: TrustfallSpacing.xxl, alignItems: 'center', gap: TrustfallSpacing.md },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: TrustfallColors.foreground },
  footerNote: { textAlign: 'center', fontSize: 12, color: TrustfallColors.muted },
  backLink: { alignItems: 'center', paddingBottom: 24 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: TrustfallSpacing.lg,
  },
  modalCard: {
    backgroundColor: TrustfallColors.surface,
    borderRadius: TrustfallRadius.xl,
    padding: TrustfallSpacing.lg,
    gap: TrustfallSpacing.md,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: TrustfallColors.foreground },
  modalImg: { width: '100%', aspectRatio: 3 / 4, borderRadius: TrustfallRadius.lg },
})
