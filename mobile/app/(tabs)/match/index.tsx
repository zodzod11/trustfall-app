import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import {
  KeyboardAvoidingView,
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
import { TfButton } from '@/components/ui/TfButton'
import { professionalsSeed, usersSeed } from '@/data/seed'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'
import { useMatchDraft } from '@/contexts/MatchDraftContext'
import { useSaved } from '@/hooks/useSaved'
import type { MatchRequestDraft } from '@/types'

const TOTAL_STEPS = 4

const TAG_OPTIONS = ['bold', 'natural', 'soft glam', 'clean', 'editorial', 'classic', 'trendy'] as const

const VISION_SUGGESTIONS = [
  'Low taper fade with texture',
  'Soft glam makeup',
  '90s aesthetic blowout',
  'Minimalist nail art',
] as const

const CATEGORY_VISION: Partial<Record<MatchRequestDraft['category'], readonly string[]>> = {
  hair: ['Face-framing layers with volume', '90s aesthetic blowout', 'Natural silk press with body'],
  nails: ['Minimalist nail art', 'Milky white structured gel set', 'Chrome french almond shape'],
  tattoo: ['Fine-line minimalist forearm design', 'Micro realism floral tattoo', 'Black and grey script concept'],
  barber: ['Low taper fade with texture', 'Burst fade + beard lineup', 'Classic taper with natural top'],
  makeup: ['Soft glam makeup', 'No-makeup makeup with dewy skin', 'Full-glam event beat with lashes'],
  brows: ['Natural brow shaping and tint', 'Soft ombre brow look', 'Laminated fluffy brow style'],
}

const STEP_ONE = [
  { label: 'Hair', value: 'hair' as const },
  { label: 'Nails', value: 'nails' as const },
  { label: 'Tattoo', value: 'tattoo' as const },
]

function getSuggestions(
  category: MatchRequestDraft['category'],
  preferred: readonly string[],
) {
  const cat = category ? CATEGORY_VISION[category] ?? [] : []
  const pref = preferred.flatMap((p) => CATEGORY_VISION[p as MatchRequestDraft['category']] ?? [])
  return [...new Set([...cat, ...pref, ...VISION_SUGGESTIONS])].slice(0, 4)
}

export default function MatchScreen() {
  const activeUser = usersSeed[0]
  const { savedPortfolioItemIds } = useSaved()
  const { setDraft } = useMatchDraft()
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
  })

  const visionSuggestions = useMemo(
    () => getSuggestions(request.category, activeUser?.preferredCategories ?? []),
    [request.category, activeUser],
  )

  const savedLooks = useMemo(() => {
    const feed = professionalsSeed.flatMap((pro) =>
      pro.portfolioItems.map((item) => ({
        id: item.id,
        serviceTitle: item.serviceTitle,
        category: item.category,
        tags: item.tags,
        imageUrl: item.afterImageUrl,
        professionalName: pro.displayName,
      })),
    )
    return savedPortfolioItemIds
      .map((id) => feed.find((item) => item.id === id))
      .filter((item): item is (typeof feed)[number] => Boolean(item))
  }, [savedPortfolioItemIds])

  const hasVision =
    request.notes.trim().length > 0 ||
    request.imageName.length > 0 ||
    Boolean(request.currentPhotoName)
  const step0Valid = request.category.length > 0
  const step1Valid = hasVision
  const step2Valid = request.location.trim().length > 0
  const canSubmit = step0Valid && step1Valid && step2Valid

  async function pickInspiration() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 })
    if (r.canceled || !r.assets[0]) return
    const a = r.assets[0]
    setSelectedSavedLookId('')
    setRequest((c) => ({
      ...c,
      imageName: a.fileName ?? 'inspiration.jpg',
      inspirationUri: a.uri,
    }))
  }

  async function pickCurrent(useCamera: boolean) {
    if (useCamera) {
      const cam = await ImagePicker.requestCameraPermissionsAsync()
      if (!cam.granted) return
      const r = await ImagePicker.launchCameraAsync({ quality: 0.85 })
      if (r.canceled || !r.assets[0]) return
      const a = r.assets[0]
      setRequest((c) => ({
        ...c,
        currentPhotoName: a.fileName ?? 'current.jpg',
        currentPhotoUri: a.uri,
      }))
      return
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 })
    if (r.canceled || !r.assets[0]) return
    const a = r.assets[0]
    setRequest((c) => ({
      ...c,
      currentPhotoName: a.fileName ?? 'current.jpg',
      currentPhotoUri: a.uri,
    }))
  }

  function buildSavedLookDescription(look: {
    serviceTitle: string
    category: string
    professionalName: string
    tags: string[]
  }) {
    const tagLine = look.tags.length > 0 ? look.tags.slice(0, 3).join(', ') : 'inspired style'
    return `I want a look similar to "${look.serviceTitle}" by ${look.professionalName}. Category: ${look.category}. Key style details: ${tagLine}.`
  }

  function toggleTag(tag: string) {
    setRequest((current) => ({
      ...current,
      tags: current.tags.includes(tag)
        ? current.tags.filter((t) => t !== tag)
        : [...current.tags, tag],
    }))
  }

  function submitRequest() {
    if (!canSubmit) return
    setDraft(request)
    router.push('/match/results')
  }

  function nextStep() {
    if (step === 0 && !step0Valid) return
    if (step === 1 && !step1Valid) return
    if (step === 2 && !step2Valid) return
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

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {step === 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionEyebrow}>Service type</Text>
              <View style={styles.row3}>
                {STEP_ONE.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => setRequest((c) => ({ ...c, category: option.value }))}
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
              <Text style={styles.hero}>Describe your vision</Text>
              <Text style={styles.body}>
                The more detail you share, the better we can match you with someone who gets your
                aesthetic.
              </Text>
              <TextInput
                value={request.notes}
                onChangeText={(t) => setRequest((c) => ({ ...c, notes: t }))}
                placeholder="Tell us your vibe, event, or specifics..."
                placeholderTextColor={TrustfallColors.muted}
                multiline
                style={styles.textarea}
              />
              <View style={styles.visualRow}>
                <TfButton title="Attach" variant="secondary" onPress={pickInspiration} />
                <TfButton title="Photo" variant="secondary" onPress={() => pickCurrent(true)} />
                <TfButton
                  title="Saved"
                  variant={savedLooksOpen ? 'primary' : 'secondary'}
                  onPress={() => setSavedLooksOpen((o) => !o)}
                />
              </View>
              {(request.inspirationUri || request.currentPhotoUri) && (
                <View style={styles.previewGrid}>
                  {request.inspirationUri ? (
                    <View style={styles.previewBox}>
                      <Text style={styles.previewLabel}>Inspiration</Text>
                      <Image source={{ uri: request.inspirationUri }} style={styles.previewImg} />
                    </View>
                  ) : null}
                  {request.currentPhotoUri ? (
                    <View style={styles.previewBox}>
                      <Text style={styles.previewLabel}>Your photo</Text>
                      <Image source={{ uri: request.currentPhotoUri }} style={styles.previewImg} />
                    </View>
                  ) : null}
                </View>
              )}
              {savedLooksOpen && (
                <View style={styles.savedBox}>
                  <Text style={styles.savedLabel}>Saved looks</Text>
                  {savedLooks.length === 0 ? (
                    <Text style={styles.mutedSmall}>Save a look from Explore to reuse it here.</Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {savedLooks.map((look) => {
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
                  )}
                </View>
              )}
              <Text style={styles.inspireLabel}>Need inspiration?</Text>
              {visionSuggestions.map((s) => (
                <Pressable key={s} onPress={() => setRequest((c) => ({ ...c, notes: s }))} style={styles.suggestion}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {step === 2 && (
            <View style={styles.section}>
              <Text style={styles.h2}>Refine your match</Text>
              <Text style={styles.body}>Style tags and location narrow your best fits.</Text>
              <Text style={styles.fieldLabel}>Style tags</Text>
              <View style={styles.tagWrap}>
                {TAG_OPTIONS.map((tag) => (
                  <Pressable
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    style={[styles.tag, request.tags.includes(tag) && styles.tagOn]}
                  >
                    <Text style={[styles.tagText, request.tags.includes(tag) && styles.tagTextOn]}>
                      {tag}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Location</Text>
              <TextInput
                value={request.location}
                onChangeText={(t) => setRequest((c) => ({ ...c, location: t }))}
                placeholder="City or area"
                placeholderTextColor={TrustfallColors.muted}
                style={styles.input}
              />
              <Pressable onPress={() => setRequest((c) => ({ ...c, location: 'Using current area' }))}>
                <Text style={styles.link}>Use my area</Text>
              </Pressable>
            </View>
          )}

          {step === 3 && (
            <View style={styles.section}>
              <Text style={styles.h2}>Review</Text>
              <Text style={styles.body}>Confirm, then we&apos;ll find your best-fit pros.</Text>
              <View style={styles.reviewCard}>
                <Text style={styles.reviewLine}>
                  <Text style={styles.reviewMuted}>Vision: </Text>
                  {request.notes || '—'}
                </Text>
                <Text style={styles.reviewLine}>
                  <Text style={styles.reviewMuted}>Category: </Text>
                  {request.category || '—'}
                </Text>
                <Text style={styles.reviewLine}>
                  <Text style={styles.reviewMuted}>Location: </Text>
                  {request.location || '—'}
                </Text>
                {request.tags.length > 0 ? (
                  <View style={styles.tagWrap}>
                    {request.tags.map((t) => (
                      <View key={t} style={styles.miniTag}>
                        <Text style={styles.miniTagText}>{t}</Text>
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
          />
          {step < TOTAL_STEPS - 1 ? (
            <TfButton title="Next" onPress={nextStep} style={styles.footerBtn} />
          ) : (
            <TfButton
              title="Find matches"
              onPress={submitRequest}
              disabled={!canSubmit}
              style={styles.footerBtn}
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
  scroll: { padding: TrustfallSpacing.lg, paddingBottom: 120, gap: TrustfallSpacing.lg },
  section: { gap: TrustfallSpacing.md },
  sectionEyebrow: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  row3: { flexDirection: 'row', gap: TrustfallSpacing.sm },
  categoryChip: {
    flex: 1,
    paddingVertical: TrustfallSpacing.md,
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    alignItems: 'center',
    backgroundColor: TrustfallColors.surface,
  },
  categoryChipOn: {
    borderColor: TrustfallColors.primary,
    backgroundColor: 'rgba(47,99,230,0.2)',
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
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
  visualRow: { flexDirection: 'row', gap: TrustfallSpacing.sm, flexWrap: 'wrap' },
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
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: TrustfallSpacing.sm },
  tag: {
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    borderRadius: TrustfallRadius.lg,
    paddingHorizontal: TrustfallSpacing.lg,
    paddingVertical: TrustfallSpacing.sm,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  tagOn: {
    borderColor: TrustfallColors.primary,
    backgroundColor: TrustfallColors.primary,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  tagTextOn: { color: TrustfallColors.primaryForeground },
  input: {
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    borderRadius: TrustfallRadius.md,
    padding: TrustfallSpacing.lg,
    fontSize: 16,
    color: TrustfallColors.foreground,
    backgroundColor: TrustfallColors.surface,
  },
  link: { fontSize: 13, fontWeight: '700', color: TrustfallColors.accent },
  reviewCard: {
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    borderRadius: TrustfallRadius.lg,
    padding: TrustfallSpacing.lg,
    gap: TrustfallSpacing.sm,
    backgroundColor: TrustfallColors.surface,
  },
  reviewLine: { fontSize: 14, color: TrustfallColors.secondary },
  reviewMuted: { color: TrustfallColors.muted },
  miniTag: {
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    borderRadius: 999,
    paddingHorizontal: TrustfallSpacing.sm,
    paddingVertical: 4,
  },
  miniTagText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: TrustfallColors.foreground },
  footer: {
    flexDirection: 'row',
    gap: TrustfallSpacing.md,
    padding: TrustfallSpacing.lg,
    paddingBottom: TrustfallSpacing.xxl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(11,19,38,0.94)',
  },
  footerBtn: { flex: 1 },
})
