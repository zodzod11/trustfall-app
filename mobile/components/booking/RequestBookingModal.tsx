import DateTimePicker from '@react-native-community/datetimepicker'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
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
import { resolvePortfolioItemId, resolveProfessionalId } from '@/lib/catalogIdMap'
import { formatDisplayLabel } from '@/lib/formatDisplayLabel'
import { uriToNotifyAttachment, uriToUploadSource } from '@/lib/localImageAttachment'
import { postNotifyContactRequest } from '@/lib/notifyContactRequest'
import { formatPhoneNumber, toDialablePhoneNumber } from '@/lib/phone'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { RequestSubmission } from '@/types'
import {
  submitRequest,
  updateRequestNotificationState,
} from '../../../src/lib/requests/service'

export const DEFAULT_REQUEST_MESSAGE =
  "Hi, I'm interested in this style and wanted to check availability."
const MESSAGE_MAX = 8000
const EMPTY_SERVICE_TAGS: string[] = []

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function toIsoTimeLocal(d: Date): string {
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function parseIsoTime(iso: string): Date {
  const [hours, minutes] = iso.split(':').map(Number)
  const next = new Date()
  next.setHours(hours ?? 9, minutes ?? 0, 0, 0)
  return next
}

function formatCalendarDate(iso: string): string {
  if (!iso.trim()) return 'Pick date'
  return parseIsoDate(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatClockTime(iso: string): string {
  if (!iso.trim()) return 'Pick time'
  return parseIsoTime(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function buildRequestMessage(input: {
  initialMessage?: string
  serviceTitle: string
  serviceDescription?: string
  serviceTags?: string[]
}): string {
  const trimmedInitial = input.initialMessage?.trim() ?? ''
  if (trimmedInitial && trimmedInitial !== DEFAULT_REQUEST_MESSAGE) return trimmedInitial

  const lines = [DEFAULT_REQUEST_MESSAGE, '', `Requested service: ${input.serviceTitle}`]
  const serviceDescription = input.serviceDescription?.trim()
  if (serviceDescription) {
    lines.push(`Service details: ${serviceDescription}`)
  }
  if (input.serviceTags && input.serviceTags.length > 0) {
    lines.push(`Style tags: ${input.serviceTags.map(formatDisplayLabel).join(', ')}`)
  }
  return lines.join('\n')
}

type Props = {
  visible: boolean
  onClose: () => void
  /** Professional id (UUID from Supabase or seed id such as `pro_001`). */
  professionalId: string
  portfolioItemId: string
  portfolioImageUrl: string
  serviceTitle: string
  serviceDescription?: string
  serviceTags?: string[]
  categorySnapshot?: string
  proName: string
  phoneNumber?: string
  proEmail?: string
  requestType?: 'direct' | 'match'
  matchRequestId?: string
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
  serviceDescription,
  serviceTags,
  categorySnapshot,
  proName,
  phoneNumber = '',
  proEmail = '',
  requestType = 'direct',
  matchRequestId,
  initialMessage,
  initialPreferredDate = '',
  initialInspirationName = '',
  initialCurrentPhotoName = '',
  initialInspirationUri = '',
  initialCurrentPhotoUri = '',
  onSubmit,
}: Props) {
  const effectiveServiceTags = serviceTags ?? EMPTY_SERVICE_TAGS
  const useStructuredSchedule = initialPreferredDate.trim().length === 0
  const [message, setMessage] = useState(
    buildRequestMessage({
      initialMessage,
      serviceTitle,
      serviceDescription,
      serviceTags: effectiveServiceTags,
    }),
  )
  const [preferredDate, setPreferredDate] = useState(initialPreferredDate)
  const [startDateIso, setStartDateIso] = useState('')
  const [endDateIso, setEndDateIso] = useState('')
  const [startTimeIso, setStartTimeIso] = useState('')
  const [endTimeIso, setEndTimeIso] = useState('')
  const [pickerTarget, setPickerTarget] = useState<
    null | 'startDate' | 'endDate' | 'startTime' | 'endTime'
  >(null)
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [inspirationImageName, setInspirationImageName] = useState(initialInspirationName)
  const [currentPhotoName, setCurrentPhotoName] = useState(initialCurrentPhotoName)
  const [inspirationUri, setInspirationUri] = useState<string | null>(null)
  const [currentPhotoUri, setCurrentPhotoUri] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [supabaseSynced, setSupabaseSynced] = useState(false)
  const [statusNote, setStatusNote] = useState<string | null>(null)
  const [notifyChannels, setNotifyChannels] = useState<string[] | null>(null)
  /** Soft info when email/SMS isn’t wired for this build (not an error). */
  const [notifyInfo, setNotifyInfo] = useState<string | null>(null)
  const [notifyWarning, setNotifyWarning] = useState<string | null>(null)
  const emailError =
    clientEmail.trim().length > 0 && !isValidEmail(clientEmail)
      ? 'Enter a valid email address.'
      : null
  const messageError =
    message.trim().length > MESSAGE_MAX
      ? `Message must be ${MESSAGE_MAX} characters or fewer.`
      : null
  const structuredPreferredDate =
    startDateIso && endDateIso && startTimeIso && endTimeIso
      ? `${formatCalendarDate(startDateIso)} → ${formatCalendarDate(endDateIso)} · ${formatClockTime(startTimeIso)} → ${formatClockTime(endTimeIso)}`
      : ''
  const invalidDateRange = Boolean(startDateIso && endDateIso && endDateIso < startDateIso)
  const invalidTimeRange = Boolean(startTimeIso && endTimeIso && endTimeIso < startTimeIso)
  const preferredDateError = useStructuredSchedule
    ? invalidDateRange
      ? 'End date must be on or after the start date.'
      : invalidTimeRange
        ? 'End time must be after the start time.'
        : structuredPreferredDate
          ? null
          : 'Choose a date range and time range before sending.'
    : preferredDate.trim()
      ? null
      : 'Add your desired day or time before sending.'
  const currentPhotoError = currentPhotoUri ? null : 'Add your current photo before sending.'
  const canSend = !isSubmitting
  const displayTags = effectiveServiceTags.map(formatDisplayLabel)
  const dialablePhoneNumber = toDialablePhoneNumber(phoneNumber)
  const canContactByPhone = dialablePhoneNumber.length > 0

  useEffect(() => {
    if (!visible) return
    setMessage(
      buildRequestMessage({
        initialMessage,
        serviceTitle,
        serviceDescription,
        serviceTags: effectiveServiceTags,
      }),
    )
    setPreferredDate(initialPreferredDate)
    setStartDateIso('')
    setEndDateIso('')
    setStartTimeIso('')
    setEndTimeIso('')
    setPickerTarget(null)
    setInspirationImageName(initialInspirationName)
    setCurrentPhotoName(initialCurrentPhotoName)
    setInspirationUri(initialInspirationUri ? initialInspirationUri : null)
    setCurrentPhotoUri(initialCurrentPhotoUri ? initialCurrentPhotoUri : null)
    setSubmitted(false)
    setIsSubmitting(false)
    setHasAttemptedSubmit(false)
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
        setClientPhone(formatPhoneNumber(demoUser.phone ?? ''))
        return
      }
      const prefill = await fetchBookingContactPrefill()
      if (cancelled) return
      if (prefill.source === 'session') {
        setClientName(prefill.clientName)
        setClientEmail(prefill.clientEmail)
        setClientPhone(formatPhoneNumber(prefill.clientPhone))
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
    serviceTitle,
    serviceDescription,
    effectiveServiceTags,
  ])

  function alertPhotoLibraryDenied() {
    Alert.alert(
      'Photos',
      'Allow photo library access to attach inspiration or current photos, or continue without photos.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => void Linking.openSettings() },
      ],
    )
  }

  async function pick(kind: 'inspiration' | 'current') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      alertPhotoLibraryDenied()
      return
    }
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
    setHasAttemptedSubmit(true)
    if (emailError || messageError || preferredDateError || currentPhotoError) return
    if (!isSupabaseConfigured) {
      setStatusNote('Cloud request persistence is not configured for this build yet.')
      Alert.alert(
        'Request unavailable',
        'Cloud request persistence is not configured for this build yet.',
      )
      return
    }
    setIsSubmitting(true)
    setSubmitted(true)
    setStatusNote(null)
    setNotifyChannels(null)
    setNotifyInfo(null)
    setNotifyWarning(null)

    const payload: RequestSubmission = {
      portfolioItemId,
      proName,
      message: message.trim() || DEFAULT_REQUEST_MESSAGE,
      preferredDate: useStructuredSchedule ? structuredPreferredDate : preferredDate,
      inspirationImageName,
      currentPhotoName,
      createdAt: new Date().toISOString(),
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      clientPhone: formatPhoneNumber(clientPhone),
      portfolioImageUrl:
        portfolioImageUrl.startsWith('http://') || portfolioImageUrl.startsWith('https://')
          ? portfolioImageUrl
          : undefined,
      inspirationUri: inspirationUri ?? undefined,
      currentPhotoUri: currentPhotoUri ?? undefined,
    }
    const warnings: string[] = []

    try {
      const inspirationUpload = inspirationUri
        ? await uriToUploadSource(inspirationUri, inspirationImageName || 'inspiration.jpg')
        : null
      const currentUpload = currentPhotoUri
        ? await uriToUploadSource(currentPhotoUri, currentPhotoName || 'current.jpg')
        : null

      if (inspirationUri && !inspirationUpload) {
        throw new Error('Could not prepare the inspiration image for upload.')
      }
      if (currentPhotoUri && !currentUpload) {
        throw new Error('Could not prepare the current photo for upload.')
      }

      const submitResult = await submitRequest({
        supabase,
        request: {
          professionalId: resolveProfessionalId(professionalId),
          portfolioItemId: resolvePortfolioItemId(portfolioItemId),
          matchRequestId,
          requestType,
          message: payload.message,
          preferredDateText: payload.preferredDate?.trim() || null,
          clientName: payload.clientName?.trim() || null,
          clientEmail: payload.clientEmail?.trim() || null,
          clientPhone: payload.clientPhone?.trim() || null,
          providerNameSnapshot: proName,
          portfolioTitleSnapshot: serviceTitle,
          categorySnapshot: categorySnapshot ?? null,
          portfolioImageUrlSnapshot: payload.portfolioImageUrl ?? null,
        },
        images: {
          inspiration: inspirationUpload,
          current: currentUpload,
        },
      })
      if (submitResult.error || !submitResult.data) {
        setSubmitted(false)
        setStatusNote(submitResult.error ?? 'Could not save your request.')
        Alert.alert(
          'Could not send request',
          submitResult.error ?? 'Could not save your request.',
        )
        return
      }

      const createdRequest = submitResult.data.request
      const imagePaths = submitResult.data.imagePaths

      const inspPart = inspirationUri
        ? await uriToNotifyAttachment(inspirationUri, inspirationImageName || 'inspiration.jpg')
        : null
      const curPart = currentPhotoUri
        ? await uriToNotifyAttachment(currentPhotoUri, currentPhotoName || 'current.jpg')
        : null

      const notifyRes = await postNotifyContactRequest({
        requestId: createdRequest.id,
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
        ...(imagePaths.inspiration_image_path
          ? { inspirationStoragePath: imagePaths.inspiration_image_path }
          : {}),
        ...(imagePaths.current_photo_path
          ? { currentPhotoStoragePath: imagePaths.current_photo_path }
          : {}),
      })

      if (notifyRes.ok && notifyRes.sent && notifyRes.sent.length > 0) {
        setNotifyChannels(notifyRes.sent)
        const updated = await updateRequestNotificationState(supabase, createdRequest.id, {
          status: 'notified',
          provider_notified_at: new Date().toISOString(),
          notified_channels: notifyRes.sent,
          notification_error: null,
        })
        if (updated.error) {
          warnings.push('The request was saved, but we could not store its notification state.')
        }
      } else if (notifyRes.skipped) {
        setNotifyInfo(
          'Automated email or text to the pro is not turned on for this build yet. Your request is still saved here.',
        )
        const updated = await updateRequestNotificationState(supabase, createdRequest.id, {
          notification_error: notifyRes.warning ?? 'Provider notification is not configured.',
        })
        if (updated.error) {
          warnings.push('The request was saved, but we could not store its notification warning.')
        }
      } else if (notifyRes.warning) {
        warnings.push(notifyRes.warning)
        const updated = await updateRequestNotificationState(supabase, createdRequest.id, {
          notification_error: notifyRes.warning,
        })
        if (updated.error) {
          warnings.push('The request was saved, but we could not store its notification warning.')
        }
      }

      setSupabaseSynced(true)
      setStatusNote('Your request is saved to your Trustfall account.')
      onSubmit(payload)
    } catch (error) {
      setSubmitted(false)
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'We could not finish sending your request.'
      setStatusNote(message)
      Alert.alert('Could not send request', message)
    } finally {
      if (warnings.length > 0) {
        setNotifyWarning(warnings.join(' '))
      }
      setIsSubmitting(false)
    }
  }

  const delivered = (notifyChannels?.length ?? 0) > 0
  const successEyebrow = isSubmitting ? 'Sending request' : delivered ? 'Request delivered' : 'Request saved'
  const successTitle = isSubmitting
    ? 'Your request is on the way.'
    : delivered
      ? `${proName} was notified.`
      : 'Your request was saved.'

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

              <View style={styles.referenceBlock}>
                <Text style={styles.label}>Selected look</Text>
                {serviceDescription?.trim() ? (
                  <Text style={styles.referenceBody}>{serviceDescription.trim()}</Text>
                ) : (
                  <Text style={styles.referenceBody}>
                    We&apos;ll send this selected look as the visual reference for your request.
                  </Text>
                )}
                {displayTags.length > 0 ? (
                  <View style={styles.referenceTagRow}>
                    {displayTags.map((tag) => (
                      <View key={tag} style={styles.referenceTag}>
                        <Text style={styles.referenceTagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                <Text style={styles.hint}>The selected portfolio image is included as your reference.</Text>
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
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                <TextInput
                  value={clientPhone}
                  onChangeText={(value) => setClientPhone(formatPhoneNumber(value))}
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
              <View style={styles.counterRow}>
                <View />
                <Text style={[styles.hint, messageError && styles.errorText]}>
                  {message.trim().length}/{MESSAGE_MAX}
                </Text>
              </View>

              {!useStructuredSchedule ? (
                <>
                  <Text style={styles.label}>Desired time</Text>
                  <TextInput
                    value={preferredDate}
                    onChangeText={setPreferredDate}
                    placeholder="e.g. Saturday afternoon or March 15 at 2pm"
                    placeholderTextColor={TrustfallColors.muted}
                    style={styles.input}
                  />
                  {hasAttemptedSubmit && preferredDateError ? (
                    <Text style={styles.errorText}>{preferredDateError}</Text>
                  ) : null}
                </>
              ) : null}

              <View style={styles.row}>
                <TfButton
                  title="Extra inspiration"
                  titleNumberOfLines={2}
                  variant="secondary"
                  onPress={() => pick('inspiration')}
                  style={styles.actionBtn}
                />
                <TfButton
                  title="Current photo"
                  titleNumberOfLines={2}
                  variant="secondary"
                  onPress={() => pick('current')}
                  style={styles.actionBtn}
                />
              </View>
              {hasAttemptedSubmit && currentPhotoError ? <Text style={styles.errorText}>{currentPhotoError}</Text> : null}
              {useStructuredSchedule ? (
                <>
                  <Text style={styles.label}>Desired schedule</Text>
                  <Text style={styles.scheduleGroupLabel}>Date range</Text>
                  <View style={styles.row}>
                    <Pressable onPress={() => setPickerTarget('startDate')} style={[styles.input, styles.scheduleField]}>
                      <Text style={startDateIso ? styles.scheduleValue : styles.schedulePlaceholder}>
                        {startDateIso ? formatCalendarDate(startDateIso) : 'Start date'}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => setPickerTarget('endDate')} style={[styles.input, styles.scheduleField]}>
                      <Text style={endDateIso ? styles.scheduleValue : styles.schedulePlaceholder}>
                        {endDateIso ? formatCalendarDate(endDateIso) : 'End date'}
                      </Text>
                    </Pressable>
                  </View>
                  <Text style={styles.scheduleGroupLabel}>Time range</Text>
                  <View style={styles.row}>
                    <Pressable onPress={() => setPickerTarget('startTime')} style={[styles.input, styles.scheduleField]}>
                      <Text style={startTimeIso ? styles.scheduleValue : styles.schedulePlaceholder}>
                        {startTimeIso ? formatClockTime(startTimeIso) : 'Start time'}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => setPickerTarget('endTime')} style={[styles.input, styles.scheduleField]}>
                      <Text style={endTimeIso ? styles.scheduleValue : styles.schedulePlaceholder}>
                        {endTimeIso ? formatClockTime(endTimeIso) : 'End time'}
                      </Text>
                    </Pressable>
                  </View>
                  {hasAttemptedSubmit && preferredDateError ? (
                    <Text style={styles.errorText}>{preferredDateError}</Text>
                  ) : null}
                  {pickerTarget === 'startDate' || pickerTarget === 'endDate' ? (
                    <DateTimePicker
                      value={
                        pickerTarget === 'endDate' && endDateIso
                          ? parseIsoDate(endDateIso)
                          : startDateIso
                            ? parseIsoDate(startDateIso)
                            : new Date()
                      }
                      mode="date"
                      minimumDate={new Date()}
                      themeVariant="dark"
                      textColor={TrustfallColors.foreground}
                      onChange={(_, selected) => {
                        const target = pickerTarget
                        setPickerTarget(null)
                        if (!selected) return
                        const nextIso = toIsoDateLocal(selected)
                        if (target === 'endDate') {
                          setEndDateIso(nextIso)
                        } else {
                          setStartDateIso(nextIso)
                        }
                      }}
                    />
                  ) : null}
                  {pickerTarget === 'startTime' || pickerTarget === 'endTime' ? (
                    <DateTimePicker
                      value={
                        pickerTarget === 'endTime' && endTimeIso
                          ? parseIsoTime(endTimeIso)
                          : startTimeIso
                            ? parseIsoTime(startTimeIso)
                            : parseIsoTime('09:00')
                      }
                      mode="time"
                      themeVariant="dark"
                      textColor={TrustfallColors.foreground}
                      onChange={(_, selected) => {
                        const target = pickerTarget
                        setPickerTarget(null)
                        if (!selected) return
                        const nextIso = toIsoTimeLocal(selected)
                        if (target === 'endTime') {
                          setEndTimeIso(nextIso)
                        } else {
                          setStartTimeIso(nextIso)
                        }
                      }}
                    />
                  ) : null}
                </>
              ) : null}
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
                disabled={!canSend}
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
                  disabled={!canContactByPhone}
                  onPress={() => void Linking.openURL(`tel:${dialablePhoneNumber}`)}
                />
                <TfButton
                  title="Text"
                  variant="secondary"
                  disabled={!canContactByPhone}
                  onPress={() => void Linking.openURL(`sms:${dialablePhoneNumber}`)}
                />
              </View>
            </>
          ) : (
            <View style={styles.success}>
              <Text style={styles.eyebrow}>{successEyebrow}</Text>
              <Text style={styles.successTitle}>{successTitle}</Text>
              {isSubmitting ? (
                <View style={styles.successProgress}>
                  <ActivityIndicator color={TrustfallColors.primary} />
                  <Text style={styles.muted}>
                    Saving your request and sending the notification now.
                  </Text>
                </View>
              ) : null}
              <Text style={styles.muted}>
                {isSubmitting
                  ? 'You can stay on this screen for confirmation.'
                  : supabaseSynced
                  ? 'Your request is saved to your Trustfall account.'
                  : statusNote
                    ? statusNote
                    : 'Your request is saved.'}
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
              <TfButton title="Done" onPress={onClose} disabled={isSubmitting} />
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
  referenceBlock: {
    gap: TrustfallSpacing.sm,
    padding: TrustfallSpacing.lg,
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: 'rgba(23,31,51,0.4)',
  },
  referenceBody: {
    fontSize: 14,
    lineHeight: 20,
    color: TrustfallColors.foreground,
  },
  referenceTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TrustfallSpacing.xs,
  },
  referenceTag: {
    paddingHorizontal: TrustfallSpacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
  },
  referenceTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: TrustfallColors.secondary,
  },
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
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: TrustfallSpacing.md,
  },
  row: { flexDirection: 'row', gap: TrustfallSpacing.md },
  actionBtn: { flex: 1 },
  scheduleField: {
    flex: 1,
    minHeight: 52,
    justifyContent: 'center',
  },
  scheduleGroupLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TrustfallColors.muted,
    marginBottom: -4,
  },
  scheduleValue: {
    fontSize: 16,
    color: TrustfallColors.foreground,
  },
  schedulePlaceholder: {
    fontSize: 16,
    color: TrustfallColors.muted,
  },
  hint: { fontSize: 12, color: TrustfallColors.muted },
  errorText: { fontSize: 12, color: '#fca5a5' },
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
  successProgress: {
    alignItems: 'center',
    gap: TrustfallSpacing.sm,
  },
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
