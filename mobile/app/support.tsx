import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { Image } from 'expo-image'
import * as FileSystem from 'expo-file-system/legacy'
import * as ImagePicker from 'expo-image-picker'
import * as MailComposer from 'expo-mail-composer'
import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TfButton } from '@/components/ui/TfButton'
import { SUPPORT_EMAIL, SUPPORT_SUBJECT } from '@/constants/support'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'
import { fetchProfileScreenModel } from '@/lib/profileScreenData'

type SupportAttachment = {
  id: string
  uri: string
  name: string
}

function BackButton() {
  return (
    <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button">
      <MaterialIcons name="chevron-left" size={24} color={TrustfallColors.foreground} />
      <Text style={styles.backText}>Back</Text>
    </Pressable>
  )
}

function attachmentName(asset: ImagePicker.ImagePickerAsset, index: number) {
  const filename = asset.fileName?.trim()
  if (filename) return filename
  return `support-image-${Date.now()}-${index + 1}.jpg`
}

async function prepareMailAttachment(attachment: SupportAttachment): Promise<string | null> {
  try {
    const safeName = attachment.name.replace(/[^a-zA-Z0-9._-]/g, '_') || `support-${Date.now()}.jpg`
    const target = `${FileSystem.cacheDirectory}${Date.now()}-${safeName}`
    await FileSystem.copyAsync({ from: attachment.uri, to: target })
    const info = await FileSystem.getInfoAsync(target)
    return info.exists ? target : null
  } catch {
    return null
  }
}

export default function SupportScreen() {
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<SupportAttachment[]>([])

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const me = await fetchProfileScreenModel()
      if (!me) return
      setName((current) => current || me.displayName)
      setEmail((current) => current || me.email)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const addPictures = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Photos', 'Allow photo library access to attach screenshots or photos.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    })

    if (result.canceled) return

    setAttachments((current) => {
      const next = result.assets.map((asset, index) => ({
        id: `${asset.assetId ?? asset.uri}-${index}`,
        uri: asset.uri,
        name: attachmentName(asset, index),
      }))
      const merged = [...current, ...next]
      return merged.slice(0, 5)
    })
  }, [])

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((item) => item.id !== id))
  }

  const sendSupportMessage = useCallback(async () => {
    const trimmedMessage = message.trim()
    if (!trimmedMessage) {
      Alert.alert('Support', 'Add a message so we know how to help.')
      return
    }

    setSending(true)
    try {
      const body = [
        `Name: ${name.trim() || 'Not provided'}`,
        `Email: ${email.trim() || 'Not provided'}`,
        '',
        trimmedMessage,
      ].join('\n')

      const mailAvailable = await MailComposer.isAvailableAsync()
      if (mailAvailable) {
        const preparedAttachments = (
          await Promise.all(attachments.map((item) => prepareMailAttachment(item)))
        ).filter((item): item is string => Boolean(item))

        await MailComposer.composeAsync({
          recipients: [SUPPORT_EMAIL],
          subject: SUPPORT_SUBJECT,
          body,
          attachments: preparedAttachments,
        })
        if (attachments.length > 0 && preparedAttachments.length !== attachments.length) {
          Alert.alert('Some pictures were skipped', 'A few selected images could not be attached.')
        }
        return
      }

      const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
        SUPPORT_SUBJECT,
      )}&body=${encodeURIComponent(body)}`
      const supported = await Linking.canOpenURL(mailtoUrl)
      if (!supported) {
        Alert.alert('Support', `Email us at ${SUPPORT_EMAIL}.`)
        return
      }
      if (attachments.length > 0) {
        Alert.alert(
          'Photos not attached',
          'This device cannot open the in-app mail composer, so your email app opened without attachments. On iOS simulators, attach pictures on a physical device instead.',
        )
      }
      await Linking.openURL(mailtoUrl)
    } finally {
      setSending(false)
    }
  }, [attachments, email, message, name])

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <BackButton />
        <Text style={styles.title}>Contact support</Text>
        <View style={styles.topSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <ActivityIndicator color={TrustfallColors.primary} style={styles.loader} />
        ) : null}

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={TrustfallColors.muted}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={TrustfallColors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Message</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="How can we help you?"
              placeholderTextColor={TrustfallColors.muted}
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.messageInput]}
            />
          </View>

          <View style={styles.field}>
            <View style={styles.attachHeader}>
              <Text style={styles.label}>Pictures</Text>
              <Text style={styles.attachHint}>Up to 5 attachments</Text>
            </View>
            <TfButton
              title={attachments.length > 0 ? 'Add more pictures' : 'Add pictures'}
              variant="secondary"
              onPress={() => void addPictures()}
            />
            {attachments.length > 0 ? (
              <View style={styles.imageGrid}>
                {attachments.map((item) => (
                  <View key={item.id} style={styles.imageCard}>
                    <Image source={{ uri: item.uri }} style={styles.image} contentFit="cover" />
                    <Pressable
                      onPress={() => removeAttachment(item.id)}
                      style={styles.removeBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${item.name}`}
                    >
                      <MaterialIcons name="close" size={16} color={TrustfallColors.primaryForeground} />
                    </Pressable>
                    <Text style={styles.imageName} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TfButton
          title={sending ? 'Sending...' : 'Send message'}
          onPress={() => void sendSupportMessage()}
          disabled={sending}
          style={styles.footerBtn}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: TrustfallColors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: TrustfallSpacing.lg,
    paddingVertical: TrustfallSpacing.md,
  },
  backBtn: { minWidth: 88, flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { fontSize: 15, fontWeight: '600', color: TrustfallColors.foreground },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: TrustfallColors.foreground,
  },
  topSpacer: { minWidth: 88 },
  scroll: {
    paddingHorizontal: TrustfallSpacing.lg,
    paddingBottom: 120,
  },
  loader: { paddingVertical: TrustfallSpacing.md },
  form: { gap: TrustfallSpacing.lg },
  field: { gap: TrustfallSpacing.sm },
  label: { fontSize: 14, fontWeight: '600', color: TrustfallColors.foreground },
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    borderRadius: TrustfallRadius.lg,
    paddingHorizontal: TrustfallSpacing.lg,
    paddingVertical: TrustfallSpacing.md,
    backgroundColor: TrustfallColors.surface,
    color: TrustfallColors.foreground,
    fontSize: 16,
  },
  messageInput: {
    minHeight: 132,
  },
  attachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: TrustfallSpacing.md,
  },
  attachHint: {
    fontSize: 12,
    color: TrustfallColors.muted,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TrustfallSpacing.sm,
  },
  imageCard: {
    width: '48%',
    gap: 6,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: TrustfallRadius.lg,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 19, 38, 0.78)',
  },
  imageName: {
    fontSize: 12,
    color: TrustfallColors.muted,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: TrustfallSpacing.lg,
    paddingTop: TrustfallSpacing.md,
    paddingBottom: TrustfallSpacing.xl,
    backgroundColor: TrustfallColors.background,
  },
  footerBtn: {
    width: '100%',
  },
})
