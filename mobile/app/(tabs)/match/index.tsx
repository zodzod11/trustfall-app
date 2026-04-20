import * as ImagePicker from 'expo-image-picker'
import type { ImagePickerAsset } from 'expo-image-picker'
import { router } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { TrustfallBrandMark, TrustfallScreenHeader } from '@/components/layout/TrustfallScreenHeader'
import { MatchRefinementStep } from '@/components/match/MatchRefinementStep'
import { TfButton } from '@/components/ui/TfButton'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'
import { useMatchDraft } from '@/contexts/MatchDraftContext'
import { useMatchSubmission } from '@/hooks/useMatchSubmission'
import { useExplorePortfolio } from '@/hooks/useExplorePortfolio'
import { useSaved } from '@/hooks/useSaved'
import { buildPortfolioFeed } from '@/lib/buildPortfolioFeed'
import { normalizeSavedPortfolioItemId } from '@/lib/catalogIdMap'
import { formatDisplayLabel } from '@/lib/formatDisplayLabel'
import {
  formatDateDisplay,
  formatLocationLine,
  formatRadiusMiles,
  formatTimeDisplay,
  isDateTimeComplete,
  isLocationComplete,
  isRefinementComplete,
  isTagsSelectionValid,
} from '@/lib/match/refinementFormat'
import type { MatchRequestDraft } from '@/types'

/** Category → inspiration → current look → location → date/time → tags → review */
const TOTAL_STEPS = 7

const CATEGORY_VISION: Partial<Record<MatchRequestDraft['category'], readonly string[]>> = {
  hair: [
    'Face-framing layers with volume',
    '90s aesthetic blowout',
    'Natural silk press with body',
    'Low taper fade with texture',
    'Burst fade + beard lineup',
    'Classic taper with natural top',
  ],
  nails: ['Minimalist nail art', 'Milky white structured gel set', 'Chrome french almond shape'],
  tattoo: ['Fine-line minimalist forearm design', 'Micro realism floral tattoo', 'Black and grey script concept'],
  makeup: ['Soft glam makeup', 'No-makeup makeup with dewy skin', 'Full-glam event beat with lashes'],
  brows: ['Natural brow shaping and tint', 'Soft ombre brow look', 'Laminated fluffy brow style'],
}

const STEP_ONE = [
  { label: 'Hair', value: 'hair' as const },
  { label: 'Nails', value: 'nails' as const },
  { label: 'Tattoo', value: 'tattoo' as const },
]

/** Inspiration chips — only for the service category they selected (Hair / Nails / Tattoo). */
function getCategoryVisionSuggestions(category: MatchRequestDraft['category']): string[] {
  if (!category) return []
  const lines = CATEGORY_VISION[category]
  return lines ? [...lines].slice(0, 5) : []
}

type SavedLookCard = {
  id: string
  serviceTitle: string
  category: Exclude<MatchRequestDraft['category'], ''>
  tags: string[]
  imageUrl: string
  professionalName: string
}

function alertPhotosDenied(message: string) {
  Alert.alert('Photos access needed', message, [
    { text: 'Not now', style: 'cancel' },
    {
      text: 'Open Settings',
      onPress: () => {
        void Linking.openSettings()
      },
    },
  ])
}

function isLocalUploadUri(uri: string | undefined): boolean {
  if (!uri) return false
  return !/^https?:\/\//i.test(uri)
}

export default function MatchScreen() {
  const { savedPortfolioItemIds } = useSaved()
  const { setDraft } = useMatchDraft()
  const { state: submissionState, submit } = useMatchSubmission()
  const { items: exploreFeed } = useExplorePortfolio()
  const seedFeed = useMemo(() => (__DEV__ ? buildPortfolioFeed() : []), [])
  const allowDevSeedFallback = __DEV__ && exploreFeed.length === 0
  const savedCatalogFeed = allowDevSeedFallback ? seedFeed : exploreFeed
  const [step, setStep] = useState(0)
  const [savedLooksOpen, setSavedLooksOpen] = useState(false)
  const [selectedSavedLookId, setSelectedSavedLookId] = useState('')
  const [request, setRequest] = useState<MatchRequestDraft>({
    imageName: '',
    currentPhotoName: '',
    notes: '',
    tags: [],
    category: '',
    location: '',
    refinement: {},
  })

  const visionSuggestions = useMemo(
    () => getCategoryVisionSuggestions(request.category),
    [request.category],
  )

  const savedLooksForCategory = useMemo(() => {
    const resolved: SavedLookCard[] = []
    for (const savedId of savedPortfolioItemIds) {
      const item = savedCatalogFeed.find(
        (entry) => entry.id === normalizeSavedPortfolioItemId(savedId),
      )
      if (!item) continue
      resolved.push({
        id: item.id,
        serviceTitle: item.serviceTitle,
        category: item.category,
        tags: item.tags,
        imageUrl: item.afterImageUrl || item.beforeImageUrl || '',
        professionalName: item.professionalName,
      })
    }
    if (!request.category) return []
    return resolved.filter((item) => item.category === request.category)
  }, [request.category, savedCatalogFeed, savedPortfolioItemIds])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSelectedSavedLookId('')
      setSavedLooksOpen(false)
    }, 0)
    return () => clearTimeout(timeout)
  }, [request.category])

  const hasInspo =
    request.notes.trim().length > 0 || Boolean(request.inspirationUri)
  const hasCurrentLook = Boolean(request.currentPhotoUri)
  const step0Valid = request.category.length > 0
  const step1Valid = hasInspo
  const step2Valid = hasCurrentLook
  const step3Valid = isLocationComplete(request.refinement)
  const step4Valid = isDateTimeComplete(request.refinement)
  const step5Valid = isTagsSelectionValid(request.tags)
  const canSubmit =
    step0Valid &&
    step1Valid &&
    step2Valid &&
    isRefinementComplete(request.refinement, request.tags)

  function applyCurrentPhotoAsset(a: ImagePickerAsset) {
    setRequest((c) => ({
      ...c,
      currentPhotoName: a.fileName ?? 'current.jpg',
      currentPhotoUri: a.uri,
    }))
  }

  async function pickCurrentFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      alertPhotosDenied(
        'Trustfall needs access to your photo library to pick a picture. Tap Open Settings, then enable Photos for Trustfall.',
      )
      return
    }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 })
    if (r.canceled || !r.assets[0]) return
    applyCurrentPhotoAsset(r.assets[0])
  }

  async function pickInspiration() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        alertPhotosDenied(
          'Trustfall needs access to your photo library to attach inspiration images. Tap Open Settings, then enable Photos for Trustfall.',
        )
        return
      }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 })
      if (r.canceled || !r.assets[0]) return
      const a = r.assets[0]
      setSelectedSavedLookId('')
      setRequest((c) => ({
        ...c,
        imageName: a.fileName ?? 'inspiration.jpg',
        inspirationUri: a.uri,
        savedLookPortfolioItemId: undefined,
      }))
    } catch (e) {
      console.warn('[Match] pickInspiration', e)
      Alert.alert("Couldn't open photos", 'Try again or check Settings → Privacy → Photos.')
    }
  }

  async function pickCurrent(useCamera: boolean) {
    if (!useCamera) {
      await pickCurrentFromLibrary()
      return
    }

    try {
      const cam = await ImagePicker.requestCameraPermissionsAsync()
      if (!cam.granted) {
        Alert.alert(
          'Camera access needed',
          'Enable camera in Settings to take a new photo, or choose an existing photo from your library.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => void Linking.openSettings() },
            { text: 'Choose from library', onPress: () => void pickCurrentFromLibrary() },
          ],
        )
        return
      }
      const r = await ImagePicker.launchCameraAsync({ quality: 0.85 })
      if (r.canceled || !r.assets[0]) return
      applyCurrentPhotoAsset(r.assets[0])
    } catch (e) {
      console.warn('[Match] camera', e)
      Alert.alert(
        "Can't use camera here",
        'Simulators, web, and some devices cannot open the camera. Choose a photo from your library instead.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Choose from library', onPress: () => void pickCurrentFromLibrary() },
        ],
      )
    }
  }

  function buildSavedLookDescription(look: {
    serviceTitle: string
    category: string
    professionalName: string
    tags: string[]
  }) {
    const tagLine = look.tags.length > 0 ? look.tags.slice(0, 3).join(', ') : 'inspired style'
    return `I want a look similar to "${look.serviceTitle}" by ${look.professionalName}. Category: ${formatDisplayLabel(look.category)}. Key style details: ${tagLine}.`
  }

  async function submitRequest() {
    if (!canSubmit) return
    setDraft(request)
    try {
      const result = await submit(request, {
        inspiration: isLocalUploadUri(request.inspirationUri)
          ? {
              uri: request.inspirationUri!,
              filename: request.imageName || 'inspiration.jpg',
              contentType: 'image/jpeg',
            }
          : null,
        current: isLocalUploadUri(request.currentPhotoUri)
          ? {
              uri: request.currentPhotoUri!,
              filename: request.currentPhotoName || 'current.jpg',
              contentType: 'image/jpeg',
            }
          : null,
      })
      if (!result.ok) {
        Alert.alert('Could not submit match request', result.error)
        return
      }
      router.push({
        pathname: '/match/results',
        params: { request: result.matchRequestId },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      Alert.alert('Could not submit match request', message)
    }
  }

  function nextStep() {
    if (step === 0 && !step0Valid) return
    if (step === 1 && !step1Valid) return
    if (step === 2 && !step2Valid) return
    if (step === 3 && !step3Valid) return
    if (step === 4 && !step4Valid) return
    if (step === 5 && !step5Valid) return
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
  }

  function previousStep() {
    setStep((s) => Math.max(s - 1, 0))
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TrustfallScreenHeader
          title="Match"
          subtitle={`Step ${step + 1} of ${TOTAL_STEPS}`}
          left={
            step === 0 ? (
              <TrustfallBrandMark />
            ) : (
              <Pressable onPress={previousStep} style={styles.iconBtn} accessibilityRole="button">
                <Text style={styles.backChevron}>‹</Text>
              </Pressable>
            )
          }
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scroll, step === 0 && styles.scrollCategoryFill]}
          keyboardShouldPersistTaps="handled"
        >
          {step === 0 && (
            <View style={[styles.section, styles.categorySection]}>
              <Text style={styles.sectionEyebrow}>Service type</Text>
              <View style={styles.categoryStack}>
                {STEP_ONE.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() =>
                      setRequest((c) => ({
                        ...c,
                        category: option.value,
                        savedLookPortfolioItemId: undefined,
                      }))
                    }
                    style={[
                      styles.categoryChip,
                      request.category === option.value && styles.categoryChipOn,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        request.category === option.value && styles.categoryChipTextOn,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {step === 1 && (
            <View style={styles.section}>
              <Text style={styles.hero}>Inspiration</Text>
              <Text style={styles.body}>
                Add reference photos and any context—what you&apos;re drawn to, event, or vibe. Your
                current look comes in the next step.
              </Text>
              <TextInput
                value={request.notes}
                onChangeText={(t) => setRequest((c) => ({ ...c, notes: t }))}
                placeholder="Optional: describe the aesthetic, occasion, or details..."
                placeholderTextColor={TrustfallColors.muted}
                multiline
                style={styles.textarea}
              />
              <View style={styles.visualRow}>
                <TfButton
                  title="Attach"
                  variant="secondary"
                  size="compact"
                  onPress={pickInspiration}
                  style={
                    savedLooksForCategory.length > 0 ? styles.visualRowBtn : styles.visualRowBtnSingle
                  }
                />
                {savedLooksForCategory.length > 0 ? (
                  <TfButton
                    title="Saved"
                    variant={savedLooksOpen ? 'primary' : 'secondary'}
                    size="compact"
                    onPress={() => setSavedLooksOpen((o) => !o)}
                    style={styles.visualRowBtn}
                  />
                ) : null}
              </View>
              {request.inspirationUri ? (
                <View style={styles.previewGrid}>
                  <View style={styles.previewBox}>
                    <Text style={styles.previewLabel}>Inspiration</Text>
                    <Image source={{ uri: request.inspirationUri }} style={styles.previewImg} />
                  </View>
                </View>
              ) : null}
              {savedLooksOpen && savedLooksForCategory.length > 0 ? (
                <View style={styles.savedBox}>
                  <Text style={styles.savedLabel}>Saved looks</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {savedLooksForCategory.map((look) => {
                      const active = selectedSavedLookId === look.id
                      return (
                        <Pressable
                          key={look.id}
                          onPress={() => {
                            setSelectedSavedLookId(look.id)
                            setRequest((c) => ({
                              ...c,
                              imageName: `Saved look: ${look.serviceTitle}`,
                              inspirationUri: look.imageUrl,
                              notes: buildSavedLookDescription(look),
                              savedLookPortfolioItemId: look.id,
                            }))
                          }}
                          style={[styles.savedCard, active && styles.savedCardOn]}
                        >
                          <Image source={{ uri: look.imageUrl }} style={styles.savedImg} />
                          <Text style={styles.savedTitle} numberOfLines={1}>
                            {look.serviceTitle}
                          </Text>
                          <Text style={styles.savedSub} numberOfLines={1}>
                            {look.professionalName}
                          </Text>
                        </Pressable>
                      )
                    })}
                  </ScrollView>
                </View>
              ) : null}
              {visionSuggestions.length > 0 ? (
                <>
                  <Text style={styles.inspireLabel}>Need inspiration?</Text>
                  {visionSuggestions.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setRequest((c) => ({ ...c, notes: s }))}
                      style={styles.suggestion}
                    >
                      <Text style={styles.suggestionText}>{s}</Text>
                    </Pressable>
                  ))}
                </>
              ) : null}
            </View>
          )}

          {step === 2 && (
            <View style={styles.section}>
              <Text style={styles.hero}>Your current look</Text>
              <Text style={styles.body}>
                Add a clear photo of where you&apos;re starting from so matches can see your hair,
                length, and color.
              </Text>
              <View style={styles.visualRow}>
                <TfButton
                  title="Take photo"
                  variant="secondary"
                  size="compact"
                  onPress={() => pickCurrent(true)}
                  style={styles.visualRowBtn}
                />
                <TfButton
                  title="Choose photo"
                  variant="secondary"
                  size="compact"
                  onPress={() => pickCurrent(false)}
                  style={styles.visualRowBtn}
                />
              </View>
              {request.currentPhotoUri ? (
                <View style={styles.previewGrid}>
                  <View style={styles.previewBox}>
                    <Text style={styles.previewLabel}>Current look</Text>
                    <Image source={{ uri: request.currentPhotoUri }} style={styles.previewImg} />
                  </View>
                </View>
              ) : null}
            </View>
          )}

          {step === 3 && (
            <View style={styles.section}>
              <MatchRefinementStep
                section="location"
                refinement={request.refinement}
                tags={request.tags}
                onChange={({ refinement, tags, locationLine }) => {
                  setRequest((c) => ({
                    ...c,
                    refinement,
                    tags,
                    location: locationLine,
                  }))
                }}
              />
            </View>
          )}

          {step === 4 && (
            <View style={styles.section}>
              <MatchRefinementStep
                section="dateTime"
                refinement={request.refinement}
                tags={request.tags}
                onChange={({ refinement, tags, locationLine }) => {
                  setRequest((c) => ({
                    ...c,
                    refinement,
                    tags,
                    location: locationLine,
                  }))
                }}
              />
            </View>
          )}

          {step === 5 && (
            <View style={styles.section}>
              <MatchRefinementStep
                section="tags"
                refinement={request.refinement}
                tags={request.tags}
                onChange={({ refinement, tags, locationLine }) => {
                  setRequest((c) => ({
                    ...c,
                    refinement,
                    tags,
                    location: locationLine,
                  }))
                }}
              />
            </View>
          )}

          {step === 6 && (
            <View style={styles.section}>
              <Text style={styles.h2}>Review</Text>
              <Text style={styles.body}>Confirm, then we&apos;ll find your best-fit pros.</Text>
              <View style={styles.reviewCard}>
                <Text style={styles.reviewLine}>
                  <Text style={styles.reviewLabel}>Category: </Text>
                  {request.category ? formatDisplayLabel(request.category) : '—'}
                </Text>
                <Text style={styles.reviewLine}>
                  <Text style={styles.reviewLabel}>Description: </Text>
                  {request.notes || '—'}
                </Text>
                {request.inspirationUri || request.currentPhotoUri ? (
                  <View style={styles.reviewPhotoRow}>
                    {request.inspirationUri ? (
                      <View style={styles.reviewPhotoCol}>
                        <Text style={styles.reviewPhotoLabel}>Inspiration</Text>
                        <Image
                          source={{ uri: request.inspirationUri }}
                          style={styles.reviewPhoto}
                          contentFit="cover"
                        />
                      </View>
                    ) : null}
                    {request.currentPhotoUri ? (
                      <View style={styles.reviewPhotoCol}>
                        <Text style={styles.reviewPhotoLabel}>Current look</Text>
                        <Image
                          source={{ uri: request.currentPhotoUri }}
                          style={styles.reviewPhoto}
                          contentFit="cover"
                        />
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <Text style={styles.reviewLine}>
                    <Text style={styles.reviewLabel}>Inspiration: </Text>
                    {request.notes ? 'Notes only' : '—'}
                  </Text>
                )}
                <Text style={styles.reviewLine}>
                  <Text style={styles.reviewLabel}>Location: </Text>
                  {request.refinement.location
                    ? formatLocationLine(request.refinement.location)
                    : request.location || '—'}
                </Text>
                <Text style={styles.reviewLine}>
                  <Text style={styles.reviewLabel}>Radius: </Text>
                  {formatRadiusMiles(request.refinement.radiusMiles)}
                </Text>
                <Text style={styles.reviewLine}>
                  <Text style={styles.reviewLabel}>Date: </Text>
                  {formatDateDisplay(request.refinement.date)}
                </Text>
                <Text style={styles.reviewLine}>
                  <Text style={styles.reviewLabel}>Time: </Text>
                  {formatTimeDisplay(request.refinement.time)}
                </Text>
                {request.tags.length > 0 ? (
                  <View style={styles.tagWrap}>
                    {request.tags.map((t) => (
                      <View key={t} style={styles.miniTag}>
                        <Text style={styles.miniTagText}>{formatDisplayLabel(t)}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TfButton
            title="Back"
            variant="secondary"
            onPress={previousStep}
            disabled={step === 0}
            style={styles.footerBtn}
            textStyle={styles.footerBtnLabel}
          />
          {step < TOTAL_STEPS - 1 ? (
            <TfButton
              title="Next"
              onPress={nextStep}
              disabled={
                (step === 3 && !step3Valid) ||
                (step === 4 && !step4Valid) ||
                (step === 5 && !step5Valid)
              }
              style={styles.footerBtn}
              textStyle={styles.footerBtnLabel}
            />
          ) : (
            <TfButton
              title={submissionState.phase === 'submitting' ? 'Finding matches...' : 'Find matches'}
              onPress={submitRequest}
              disabled={!canSubmit || submissionState.phase === 'submitting'}
              style={styles.footerBtn}
              textStyle={styles.footerBtnLabel}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: TrustfallColors.background },
  flex: { flex: 1 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChevron: { fontSize: 28, color: TrustfallColors.primary, marginTop: -4 },
  scrollView: { flex: 1 },
  scroll: { padding: TrustfallSpacing.lg, paddingBottom: 120, gap: TrustfallSpacing.lg },
  /** Lets the service-type step stretch to the viewport so vertical options can breathe. */
  scrollCategoryFill: { flexGrow: 1 },
  section: { gap: TrustfallSpacing.md },
  sectionEyebrow: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  categorySection: {
    flexGrow: 1,
    minHeight: 420,
    width: '100%',
  },
  categoryStack: {
    flex: 1,
    width: '100%',
    gap: TrustfallSpacing.lg,
    justifyContent: 'space-evenly',
    paddingVertical: TrustfallSpacing.sm,
  },
  categoryChip: {
    alignSelf: 'stretch',
    width: '100%',
    minHeight: 88,
    paddingVertical: TrustfallSpacing.lg,
    paddingHorizontal: TrustfallSpacing.xl,
    borderRadius: TrustfallRadius.xl,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TrustfallColors.surface,
  },
  categoryChipOn: {
    borderColor: TrustfallColors.primary,
    backgroundColor: 'rgba(47,99,230,0.2)',
  },
  categoryChipText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  categoryChipTextOn: { color: TrustfallColors.foreground },
  hero: { fontSize: 32, fontWeight: '700', color: TrustfallColors.foreground, letterSpacing: -0.5 },
  h2: { fontSize: 26, fontWeight: '700', color: TrustfallColors.foreground },
  body: { fontSize: 15, lineHeight: 22, color: TrustfallColors.muted },
  textarea: {
    minHeight: 200,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    borderRadius: TrustfallRadius.xl,
    padding: TrustfallSpacing.lg,
    fontSize: 18,
    color: TrustfallColors.foreground,
    backgroundColor: TrustfallColors.surface,
    textAlignVertical: 'top',
  },
  visualRow: {
    flexDirection: 'row',
    gap: TrustfallSpacing.sm,
    alignItems: 'stretch',
  },
  /** Equal-width toolbar buttons — stays one row on typical phone widths. */
  visualRowBtn: { flex: 1, minWidth: 0 },
  /** When Saved is hidden (no saves for this category), Attach spans the row. */
  visualRowBtnSingle: { flex: 1, minWidth: 0, alignSelf: 'stretch' },
  previewGrid: { flexDirection: 'row', gap: TrustfallSpacing.md },
  previewBox: { flex: 1, gap: TrustfallSpacing.sm },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  previewImg: {
    aspectRatio: 4 / 5,
    borderRadius: TrustfallRadius.lg,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  savedBox: {
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    borderRadius: TrustfallRadius.lg,
    padding: TrustfallSpacing.md,
    gap: TrustfallSpacing.sm,
  },
  savedLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, color: TrustfallColors.muted },
  mutedSmall: { fontSize: 12, color: TrustfallColors.muted },
  savedCard: {
    width: 140,
    marginRight: TrustfallSpacing.sm,
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    overflow: 'hidden',
    paddingBottom: TrustfallSpacing.sm,
  },
  savedCardOn: { borderColor: TrustfallColors.primary },
  savedImg: { width: '100%', aspectRatio: 4 / 5 },
  savedTitle: { fontSize: 12, fontWeight: '700', color: TrustfallColors.foreground, paddingHorizontal: 8 },
  savedSub: { fontSize: 10, color: TrustfallColors.muted, paddingHorizontal: 8 },
  inspireLabel: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  suggestion: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    borderRadius: 999,
    paddingHorizontal: TrustfallSpacing.xxl,
    paddingVertical: TrustfallSpacing.md,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  suggestionText: { fontSize: 14, fontWeight: '600', color: TrustfallColors.secondary },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: TrustfallSpacing.sm },
  reviewCard: {
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    borderRadius: TrustfallRadius.lg,
    padding: TrustfallSpacing.lg,
    gap: TrustfallSpacing.sm,
    backgroundColor: TrustfallColors.surface,
  },
  reviewLine: { fontSize: 14, color: TrustfallColors.secondary },
  reviewLabel: { color: TrustfallColors.muted, fontWeight: '700' },
  reviewMuted: { color: TrustfallColors.muted },
  reviewPhotoRow: { flexDirection: 'row', gap: TrustfallSpacing.md },
  reviewPhotoCol: { flex: 1, gap: TrustfallSpacing.xs },
  reviewPhotoLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  reviewPhoto: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: TrustfallRadius.md,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  miniTag: {
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    borderRadius: 999,
    paddingHorizontal: TrustfallSpacing.sm,
    paddingVertical: 4,
  },
  miniTagText: { fontSize: 10, fontWeight: '700', color: TrustfallColors.foreground },
  footer: {
    flexDirection: 'row',
    gap: TrustfallSpacing.md,
    padding: TrustfallSpacing.lg,
    paddingBottom: TrustfallSpacing.xxl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(11,19,38,0.94)',
  },
  footerBtn: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
  },
  footerBtnLabel: { fontSize: 16, fontWeight: '700' },
})
