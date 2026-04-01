import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { TfButton } from '@/components/ui/TfButton'
import { usersSeed } from '@/data/seed'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'
import { fetchBookingContactPrefill } from '@/lib/bookingContactPrefill'
import { canResolveForContactRequest, resolvePortfolioItemId, resolveProfessionalId } from '@/lib/catalogIdMap'
import { extForUri, uriToNotifyAttachment } from '@/lib/localImageAttachment'
import { postNotifyContactRequest } from '@/lib/notifyContactRequest'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import {
  uploadClientBookingNotifyStagingPhoto,
  uploadClientContactPhoto,
} from '@/lib/trustfallStorage'
import { createContactRequest, updateContactRequestImagePaths } from '@/services/user'
import type { RequestSubmission } from '@/types'

export const DEFAULT_REQUEST_MESSAGE =
  "Hi, I'm interested in this style and wanted to check availability."

type Props = {
  visible: boolean
  onClose: () => void
  /** Professional id (UUID from Supabase or seed id such as `pro_001`). */
  professionalId: string
  portfolioItemId: string
  portfolioImageUrl: string
  serviceTitle: string
  proName: string
  phoneNumber?: string
  proEmail?: string
  initialMessage?: string
  initialPreferredDate?: string
  initialInspirationName?: string
  initialCurrentPhotoName?: string
  /** Prefill from Match draft (local URIs). */
  initialInspirationUri?: string
  initialCurrentPhotoUri?: string
  onSubmit: (payload: RequestSubmission) => void
}

const demoUser = usersSeed[0]

export function RequestBookingModal({
  visible,
  onClose,
  professionalId,
  portfolioItemId,
  portfolioImageUrl,
  serviceTitle,
  proName,
  phoneNumber = '+17135551234',
  proEmail = '',
  initialMessage,
  initialPreferredDate = '',
  initialInspirationName = '',
  initialCurrentPhotoName = '',
  initialInspirationUri = '',
  initialCurrentPhotoUri = '',
  onSubmit,
}: Props) {
  const [message, setMessage] = useState(initialMessage ?? DEFAULT_REQUEST_MESSAGE)
  const [preferredDate, setPreferredDate] = useState(initialPreferredDate)
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [inspirationImageName, setInspirationImageName] = useState(initialInspirationName)
  const [currentPhotoName, setCurrentPhotoName] = useState(initialCurrentPhotoName)
  const [inspirationUri, setInspirationUri] = useState<string | null>(null)
  const [currentPhotoUri, setCurrentPhotoUri] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [supabaseSynced, setSupabaseSynced] = useState(false)
  const [statusNote, setStatusNote] = useState<string | null>(null)
  const [notifyChannels, setNotifyChannels] = useState<string[] | null>(null)
  /** Soft info when email/SMS isn’t wired for this build (not an error). */
  const [notifyInfo, setNotifyInfo] = useState<string | null>(null)
  const [notifyWarning, setNotifyWarning] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) return
    setMessage(initialMessage ?? DEFAULT_REQUEST_MESSAGE)
    setPreferredDate(initialPreferredDate)
    setInspirationImageName(initialInspirationName)
    setCurrentPhotoName(initialCurrentPhotoName)
    setInspirationUri(initialInspirationUri ? initialInspirationUri : null)
    setCurrentPhotoUri(initialCurrentPhotoUri ? initialCurrentPhotoUri : null)
    setSubmitted(false)
    setIsSubmitting(false)
    setSupabaseSynced(false)
    setStatusNote(null)
    setNotifyChannels(null)
    setNotifyInfo(null)
    setNotifyWarning(null)

    let cancelled = false
    ;(async () => {
      if (!isSupabaseConfigured) {
        setClientName(`${demoUser.firstName} ${demoUser.lastName}`.trim())
        setClientEmail(demoUser.email)
        setClientPhone(demoUser.phone ?? '')
        return
      }
      const prefill = await fetchBookingContactPrefill()
      if (cancelled) return
      if (prefill.source === 'session') {
        setClientName(prefill.clientName)
        setClientEmail(prefill.clientEmail)
        setClientPhone(prefill.clientPhone)
      } else {
        setClientName('')
        setClientEmail('')
        setClientPhone('')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    visible,
    portfolioItemId,
    initialMessage,
    initialPreferredDate,
    initialInspirationName,
    initialCurrentPhotoName,
    initialInspirationUri,
    initialCurrentPhotoUri,
  ])

  async function pick(kind: 'inspiration' | 'current') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    })
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    const name = asset.fileName ?? 'image.jpg'
    if (kind === 'inspiration') {
      setInspirationImageName(name)
      setInspirationUri(asset.uri)
    } else {
      setCurrentPhotoName(name)
      setCurrentPhotoUri(asset.uri)
    }
  }

  async function submit() {
    if (isSubmitting) return
    setIsSubmitting(true)
    setStatusNote(null)
    setNotifyChannels(null)
    setNotifyInfo(null)
    setNotifyWarning(null)

    const payload: RequestSubmission = {
      portfolioItemId,
      proName,
      message: message.trim() || DEFAULT_REQUEST_MESSAGE,
      preferredDate,
      inspirationImageName,
      currentPhotoName,
      createdAt: new Date().toISOString(),
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      clientPhone: clientPhone.trim(),
      portfolioImageUrl:
        portfolioImageUrl.startsWith('http://') || portfolioImageUrl.startsWith('https://')
          ? portfolioImageUrl
          : undefined,
      inspirationUri: inspirationUri ?? undefined,
      currentPhotoUri: currentPhotoUri ?? undefined,
    }
    onSubmit(payload)

    const resolvedPro = resolveProfessionalId(professionalId)
    const resolvedPortfolio = resolvePortfolioItemId(portfolioItemId)
    const canSync = canResolveForContactRequest(professionalId, portfolioItemId)

    let synced = false
    let inspirationStoragePath: string | undefined
    let currentPhotoStoragePath: string | undefined
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    if (isSupabaseConfigured && user && canSync) {
      const cr = await createContactRequest({
        professional_id: resolvedPro,
        portfolio_item_id: resolvedPortfolio,
        message: payload.message,
        preferred_date_text: payload.preferredDate?.trim() || null,
        client_name: payload.clientName?.trim() || null,
        client_email: payload.clientEmail?.trim() || null,
        client_phone: payload.clientPhone?.trim() || null,
      })
      if (!cr.error && cr.data) {
        synced = true
        const rowId = cr.data.id
        const pathUpdates: {
          inspiration_image_path?: string | null
          current_photo_path?: string | null
        } = {}

        if (inspirationUri) {
          const ext = extForUri(inspirationUri, inspirationImageName)
          const up = await uploadClientContactPhoto(user.id, rowId, 'inspiration', inspirationUri, {
            ext,
          })
          if (!up.error && up.data?.path) {
            pathUpdates.inspiration_image_path = up.data.path
            inspirationStoragePath = up.data.path
          }
        }
        if (currentPhotoUri) {
          const ext = extForUri(currentPhotoUri, currentPhotoName)
          const up = await uploadClientContactPhoto(user.id, rowId, 'current', currentPhotoUri, {
            ext,
          })
          if (!up.error && up.data?.path) {
            pathUpdates.current_photo_path = up.data.path
            currentPhotoStoragePath = up.data.path
          }
        }
        if (Object.keys(pathUpdates).length > 0) {
          await updateContactRequestImagePaths(rowId, pathUpdates)
        }
      } else if (cr.error) {
        setStatusNote(cr.error.message ?? 'Could not save to Supabase.')
      }
    } else if (!isSupabaseConfigured) {
      setStatusNote(
        'Cloud backup is not enabled for this app yet—your request is still saved on this device.',
      )
    } else if (!user) {
      setStatusNote('Sign in to save requests to your account so they sync across your devices.')
    } else if (!canSync) {
      setStatusNote('This look is not linked to the live catalog, so it’s kept on this device only.')
    }

    // If contact-request uploads didn’t run or didn’t return paths, still push images to Storage
    // so the notify server can sign URLs (same bucket; path starts with user id for RLS).
    if (
      isSupabaseConfigured &&
      user &&
      (inspirationUri || currentPhotoUri) &&
      (!inspirationStoragePath || !currentPhotoStoragePath)
    ) {
      let stagingId: string | null = null
      const nextStagingId = () => {
        if (!stagingId) stagingId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
        return stagingId
      }
      if (inspirationUri && !inspirationStoragePath) {
        const ext = extForUri(inspirationUri, inspirationImageName)
        const up = await uploadClientBookingNotifyStagingPhoto(
          user.id,
          nextStagingId(),
          'inspiration',
          inspirationUri,
          { ext },
        )
        if (!up.error && up.data?.path) {
          inspirationStoragePath = up.data.path
        }
      }
      if (currentPhotoUri && !currentPhotoStoragePath) {
        const ext = extForUri(currentPhotoUri, currentPhotoName)
        const up = await uploadClientBookingNotifyStagingPhoto(
          user.id,
          nextStagingId(),
          'current',
          currentPhotoUri,
          { ext },
        )
        if (!up.error && up.data?.path) {
          currentPhotoStoragePath = up.data.path
        }
      }
    }

    const inspPart = inspirationUri
      ? await uriToNotifyAttachment(inspirationUri, inspirationImageName || 'inspiration.jpg')
      : null
    const curPart = currentPhotoUri
      ? await uriToNotifyAttachment(currentPhotoUri, currentPhotoName || 'current.jpg')
      : null

    const notifyRes = await postNotifyContactRequest({
      portfolioItemId: payload.portfolioItemId,
      proName: payload.proName,
      message: payload.message,
      preferredDate: payload.preferredDate,
      inspirationImageName: payload.inspirationImageName,
      currentPhotoName: payload.currentPhotoName,
      createdAt: payload.createdAt,
      clientName: payload.clientName ?? '',
      clientEmail: payload.clientEmail ?? '',
      clientPhone: payload.clientPhone ?? '',
      portfolioImageUrl: payload.portfolioImageUrl ?? '',
      serviceTitle,
      phoneNumber,
      proEmail,
      attachments: { inspiration: inspPart, current: curPart },
      ...(inspirationStoragePath ? { inspirationStoragePath } : {}),
      ...(currentPhotoStoragePath ? { currentPhotoStoragePath } : {}),
    })

    if (notifyRes.skipped) {
      setNotifyInfo(
        'Automated email or text to the pro isn’t turned on for this app yet. Your request is still saved here.',
      )
    } else if (notifyRes.ok && notifyRes.sent && notifyRes.sent.length > 0) {
      setNotifyChannels(notifyRes.sent)
    } else if (notifyRes.warning) {
      setNotifyWarning(notifyRes.warning)
    }

    setSupabaseSynced(synced)
    setSubmitted(true)
    setIsSubmitting(false)
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {!submitted ? (
            <>
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.eyebrow}>Send request</Text>
                  <Text style={styles.title}>{proName}</Text>
                  <Text style={styles.sub}>{serviceTitle}</Text>
                </View>
                <Pressable onPress={onClose} style={styles.closeBtn}>
                  <Text style={styles.closeText}>Close</Text>
                </Pressable>
              </View>

              <View style={styles.hero}>
                <Image source={{ uri: portfolioImageUrl }} style={styles.heroImg} contentFit="cover" />
              </View>

              <View style={styles.block}>
                <Text style={styles.label}>Your contact</Text>
                <TextInput
                  value={clientName}
                  onChangeText={setClientName}
                  placeholder="Name"
                  placeholderTextColor={TrustfallColors.muted}
                  style={styles.input}
                />
                <TextInput
                  value={clientEmail}
                  onChangeText={setClientEmail}
                  placeholder="Email"
                  placeholderTextColor={TrustfallColors.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />
                <TextInput
                  value={clientPhone}
                  onChangeText={setClientPhone}
                  placeholder="Phone"
                  placeholderTextColor={TrustfallColors.muted}
                  keyboardType="phone-pad"
                  style={styles.input}
                />
              </View>

              <Text style={styles.label}>Message</Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={5}
                style={[styles.input, styles.textarea]}
              />

              <Text style={styles.label}>Preferred date (optional)</Text>
              <TextInput
                value={preferredDate}
                onChangeText={setPreferredDate}
                placeholder="e.g. March 15 afternoon"
                placeholderTextColor={TrustfallColors.muted}
                style={styles.input}
              />

              <View style={styles.row}>
                <TfButton title="Add inspiration" variant="secondary" onPress={() => pick('inspiration')} />
                <TfButton title="Your photo" variant="secondary" onPress={() => pick('current')} />
              </View>
              {inspirationImageName ? (
                <Text style={styles.hint}>Inspiration: {inspirationImageName}</Text>
              ) : null}
              {currentPhotoName ? <Text style={styles.hint}>Your photo: {currentPhotoName}</Text> : null}

              {(inspirationUri || currentPhotoUri) && (
                <View style={styles.previewRow}>
                  {inspirationUri ? (
                    <View style={styles.previewCol}>
                      <Text style={styles.previewLabel}>Inspiration</Text>
                      <Image
                        source={{ uri: inspirationUri }}
                        style={styles.previewImg}
                        contentFit="cover"
                      />
                    </View>
                  ) : null}
                  {currentPhotoUri ? (
                    <View style={styles.previewCol}>
                      <Text style={styles.previewLabel}>Your photo</Text>
                      <Image
                        source={{ uri: currentPhotoUri }}
                        style={styles.previewImg}
                        contentFit="cover"
                      />
                    </View>
                  ) : null}
                </View>
              )}

              <Pressable
                onPress={() => void submit()}
                disabled={isSubmitting}
                style={[styles.primarySend, isSubmitting && styles.primarySendDisabled]}
              >
                {isSubmitting ? (
                  <View style={styles.sendingRow}>
                    <ActivityIndicator color={TrustfallColors.primaryForeground} />
                    <Text style={styles.primarySendText}>Sending…</Text>
                  </View>
                ) : (
                  <Text style={styles.primarySendText}>Send request</Text>
                )}
              </Pressable>
              <View style={styles.row}>
                <TfButton
                  title="Call"
                  variant="secondary"
                  onPress={() => void Linking.openURL(`tel:${phoneNumber}`)}
                />
                <TfButton
                  title="Text"
                  variant="secondary"
                  onPress={() => void Linking.openURL(`sms:${phoneNumber}`)}
                />
              </View>
            </>
          ) : (
            <View style={styles.success}>
              <Text style={styles.eyebrow}>Request sent</Text>
              <Text style={styles.successTitle}>{proName} has your details.</Text>
              <Text style={styles.muted}>
                {supabaseSynced
                  ? 'Your request is saved on this device and to your Trustfall account.'
                  : statusNote
                    ? statusNote
                    : 'Your request is saved on this device.'}
              </Text>
              {notifyChannels && notifyChannels.length > 0 ? (
                <Text style={styles.muted}>
                  We also sent a notification by{' '}
                  {notifyChannels
                    .map((c) => (c.toLowerCase() === 'sms' ? 'text' : c))
                    .join(' and ')}
                  .
                </Text>
              ) : null}
              {notifyInfo ? <Text style={styles.muted}>{notifyInfo}</Text> : null}
              {notifyWarning ? <Text style={styles.warnText}>{notifyWarning}</Text> : null}
              <TfButton title="Done" onPress={onClose} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: TrustfallColors.background },
  scroll: { padding: TrustfallSpacing.xxl, paddingBottom: 48, gap: TrustfallSpacing.md },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: TrustfallSpacing.lg,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  title: { fontSize: 22, fontWeight: '700', color: TrustfallColors.foreground },
  sub: { fontSize: 14, color: TrustfallColors.secondary, marginTop: 4 },
  closeBtn: {
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    borderRadius: TrustfallRadius.md,
    paddingHorizontal: TrustfallSpacing.md,
    paddingVertical: TrustfallSpacing.sm,
  },
  closeText: { fontSize: 12, color: TrustfallColors.muted, fontWeight: '600' },
  hero: {
    borderRadius: TrustfallRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: TrustfallColors.border,
  },
  heroImg: { width: '100%', aspectRatio: 16 / 10 },
  block: {
    gap: TrustfallSpacing.sm,
    padding: TrustfallSpacing.lg,
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: 'rgba(23,31,51,0.5)',
  },
  label: { fontSize: 13, fontWeight: '600', color: TrustfallColors.secondary },
  input: {
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    borderRadius: TrustfallRadius.md,
    paddingHorizontal: TrustfallSpacing.lg,
    paddingVertical: TrustfallSpacing.md,
    color: TrustfallColors.foreground,
    fontSize: 16,
    backgroundColor: TrustfallColors.surface,
  },
  textarea: { minHeight: 120, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: TrustfallSpacing.md },
  hint: { fontSize: 12, color: TrustfallColors.muted },
  previewRow: { flexDirection: 'row', gap: TrustfallSpacing.md },
  previewCol: { flex: 1, gap: TrustfallSpacing.sm },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  previewImg: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: TrustfallRadius.md,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  success: { gap: TrustfallSpacing.lg, alignItems: 'center', paddingVertical: TrustfallSpacing.xxl },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TrustfallColors.foreground,
    textAlign: 'center',
  },
  muted: { fontSize: 14, color: TrustfallColors.muted, textAlign: 'center' },
  warnText: { fontSize: 12, color: TrustfallColors.secondary, textAlign: 'center' },
  primarySend: {
    borderRadius: TrustfallRadius.md,
    backgroundColor: TrustfallColors.primary,
    paddingVertical: TrustfallSpacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primarySendDisabled: { opacity: 0.7 },
  primarySendText: { fontSize: 16, fontWeight: '700', color: TrustfallColors.primaryForeground },
  sendingRow: { flexDirection: 'row', alignItems: 'center', gap: TrustfallSpacing.sm },
})
