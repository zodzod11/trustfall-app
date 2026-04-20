import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useFocusEffect } from '@react-navigation/native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRequestHistory } from '../../../src/hooks/useRequestHistory'
import { TrustfallBrandMark, TrustfallScreenHeader } from '@/components/layout/TrustfallScreenHeader'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'
import { useSaved } from '@/hooks/useSaved'
import {
  type ProfileScreenModel,
  fetchProfileScreenModel,
  profileInitials,
} from '@/lib/profileScreenData'
import {
  buildRequestSubmissionPreview,
  formatRequestSubmissionDate,
  getRequestSubmissionId,
  REQUEST_HISTORY_ALL_THRESHOLD,
  REQUEST_HISTORY_PREVIEW_COUNT,
} from '@/lib/requestHistory'
import { formatPhoneNumber } from '@/lib/phone'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { avatarPath, uploadAvatar } from '@/lib/trustfallStorage'

function ProfileAccountMenu() {
  const [menuOpen, setMenuOpen] = useState(false)

  async function signOut() {
    setMenuOpen(false)
    await supabase.auth.signOut()
    router.replace('/welcome')
  }

  function openNativeMenu() {
    Alert.alert('Account', undefined, [
      { text: 'Settings', onPress: () => router.push('/settings') },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void signOut()
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  if (Platform.OS === 'web') {
    return (
      <>
        <Pressable
          onPress={() => setMenuOpen(true)}
          style={styles.menuBtn}
          accessibilityRole="button"
          accessibilityLabel="Account menu"
        >
          <MaterialIcons name="more-vert" size={24} color={TrustfallColors.muted} />
        </Pressable>
        <Modal
          visible={menuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuOpen(false)}
        >
          <View style={styles.menuModalRoot}>
            <Pressable onPress={() => setMenuOpen(false)} style={StyleSheet.absoluteFillObject} />
            <View style={styles.menuSheet} onStartShouldSetResponder={() => true}>
              <Pressable
                style={styles.menuRow}
                onPress={() => {
                  setMenuOpen(false)
                  router.push('/settings')
                }}
              >
                <Text style={styles.menuRowText}>Settings</Text>
              </Pressable>
              <Pressable
                style={[styles.menuRow, styles.menuRowDanger]}
                onPress={() => void signOut()}
              >
                <Text style={styles.menuRowTextDanger}>Sign out</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </>
    )
  }

  return (
    <Pressable
      onPress={openNativeMenu}
      style={styles.menuBtn}
      accessibilityRole="button"
      accessibilityLabel="Account menu"
    >
      <MaterialIcons name="more-vert" size={24} color={TrustfallColors.muted} />
    </Pressable>
  )
}

export default function ProfileScreen() {
  const { savedPortfolioItemIds, savedProfessionalIds, hydrated: savedHydrated } = useSaved()
  const {
    items: requestHistory,
    loading: requestsLoading,
    refresh: refreshRequests,
  } = useRequestHistory(supabase, { limit: 100 })
  const recentRequests = requestHistory.slice(0, REQUEST_HISTORY_PREVIEW_COUNT)

  const [me, setMe] = useState<ProfileScreenModel | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false)

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setMe(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setMe(await fetchProfileScreenModel())
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void reload()
      void refreshRequests()
    }, [refreshRequests, reload]),
  )

  useEffect(() => {
    setAvatarLoadFailed(false)
  }, [me?.avatarDisplayUrl])

  function avatarFileExtension(mimeType: string | null | undefined) {
    if (mimeType === 'image/png') return 'png'
    if (mimeType === 'image/webp') return 'webp'
    return 'jpg'
  }

  const changeProfilePhoto = useCallback(async () => {
    if (!isSupabaseConfigured || avatarBusy) return
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert(
        'Photos',
        'Allow photo library access in Settings to set your profile picture.',
      )
      return
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.88,
    })
    if (picked.canceled) return
    const asset = picked.assets[0]
    if (!asset?.uri) return

    setAvatarBusy(true)
    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser()
      if (authErr || !authData.user) {
        Alert.alert('Sign in required', 'Sign in to update your profile photo.')
        return
      }
      const uid = authData.user.id
      const contentType =
        asset.mimeType && asset.mimeType.startsWith('image/')
          ? asset.mimeType
          : 'image/jpeg'
      const ext = avatarFileExtension(asset.mimeType)
      const filename = `avatar-${Date.now()}.${ext}`
      const { error: upErr } = await uploadAvatar(uid, { uri: asset.uri }, {
        contentType,
        upsert: true,
        filename,
      })
      if (upErr) {
        Alert.alert('Upload failed', upErr.message)
        return
      }
      const storagePath = avatarPath(uid, filename)
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ avatar_url: storagePath })
        .eq('id', uid)
      if (dbErr) {
        Alert.alert('Could not save photo', dbErr.message)
        return
      }
      await reload()
    } finally {
      setAvatarBusy(false)
    }
  }, [avatarBusy, reload])

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TrustfallScreenHeader
        title="Profile"
        subtitle="Account"
        left={<TrustfallBrandMark />}
        right={<ProfileAccountMenu />}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading || !savedHydrated ? (
          <ActivityIndicator color={TrustfallColors.primary} style={styles.loader} />
        ) : !me ? (
          isSupabaseConfigured ? (
            <View style={styles.signedOutCard}>
              <Text style={styles.signedOutTitle}>You’re signed out</Text>
              <Text style={styles.muted}>
                Sign in to see your name, email, and preferences from your Trustfall account.
              </Text>
              <Pressable
                onPress={() =>
                  router.push(`/sign-in?next=${encodeURIComponent('/profile')}`)
                }
                style={styles.signedOutBtn}
              >
                <Text style={styles.signedOutBtnText}>Sign in</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.muted}>
              Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and key to load your profile.
            </Text>
          )
        ) : (
          <>
            <View style={styles.userRow}>
              <Pressable
                onPress={() => void changeProfilePhoto()}
                disabled={avatarBusy}
                style={({ pressed }) => [
                  styles.avatar,
                  pressed && styles.avatarPressed,
                  avatarBusy && styles.avatarDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Profile photo. Tap to change."
              >
                {me.avatarDisplayUrl && !avatarLoadFailed ? (
                  <Image
                    source={{ uri: me.avatarDisplayUrl }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    transition={160}
                    onError={() => setAvatarLoadFailed(true)}
                  />
                ) : (
                  <Text style={styles.avatarText}>{profileInitials(me.displayName)}</Text>
                )}
                {avatarBusy ? (
                  <View style={styles.avatarSpinner}>
                    <ActivityIndicator color={TrustfallColors.primaryForeground} />
                  </View>
                ) : null}
              </Pressable>
              <View style={styles.userTextCol}>
                <Text style={styles.name}>{me.displayName}</Text>
                <Text style={styles.email}>{me.email}</Text>
                {me.phone ? <Text style={styles.metaLine}>{formatPhoneNumber(me.phone)}</Text> : null}
                {me.city ? <Text style={styles.metaLine}>{me.city}</Text> : null}
              </View>
            </View>

            <View style={styles.stats}>
              {[
                { label: 'Saved looks', value: savedPortfolioItemIds.length },
                { label: 'Saved pros', value: savedProfessionalIds.length },
                { label: 'Requests', value: requestHistory.length },
              ].map((s) => (
                <View key={s.label} style={styles.statCard}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Preferences</Text>
            <View style={styles.prefNavCard}>
              <Pressable
                onPress={() => router.push('/profile-personal-preferences')}
                style={styles.prefNavRow}
              >
                <View style={styles.prefNavBody}>
                  <Text style={styles.prefNavTitle}>Personal preferences</Text>
                  <Text style={styles.prefNavSubtitle}>Budget, saved activity, and request-based signals.</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={TrustfallColors.muted} />
              </Pressable>
              <View style={styles.prefNavDivider} />
              <Pressable
                onPress={() => router.push('/profile-onboarding-preferences')}
                style={styles.prefNavRow}
              >
                <View style={styles.prefNavBody}>
                  <Text style={styles.prefNavTitle}>Onboarding preferences</Text>
                  <Text style={styles.prefNavSubtitle}>The categories you picked to personalize Explore.</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={TrustfallColors.muted} />
              </Pressable>
            </View>

            <Text style={styles.sectionLabel}>Support</Text>
            <View style={styles.prefNavCard}>
              <Pressable onPress={() => router.push('/support')} style={styles.prefNavRow}>
                <View style={styles.prefNavBody}>
                  <Text style={styles.prefNavTitle}>Contact support</Text>
                  <Text style={styles.prefNavSubtitle}>Ask questions, share feedback, and attach screenshots.</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={TrustfallColors.muted} />
              </Pressable>
            </View>
          </>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>Recent requests</Text>
          {requestHistory.length >= REQUEST_HISTORY_ALL_THRESHOLD ? (
            <Pressable onPress={() => router.push('/profile-requests')}>
              <Text style={styles.sectionAction}>All requests</Text>
            </Pressable>
          ) : null}
        </View>
        {requestsLoading ? (
          <Text style={styles.muted}>Loading your requests...</Text>
        ) : recentRequests.length === 0 ? (
          <Text style={styles.muted}>No requests yet. Send one from Match results or Explore.</Text>
        ) : (
          recentRequests.map((r) => (
            <Pressable
              key={getRequestSubmissionId(r)}
              onPress={() =>
                router.push(`/profile-request/${encodeURIComponent(getRequestSubmissionId(r))}`)
              }
              style={styles.reqLineItem}
            >
              <View style={styles.reqLineBody}>
                <Text style={styles.reqLineTitle} numberOfLines={1}>
                  {r.provider_name_snapshot || 'Professional'}
                </Text>
                <Text style={styles.reqLineMeta}>
                  {formatRequestSubmissionDate(r.created_at)}
                  {r.preferred_date_text ? ` · ${r.preferred_date_text}` : ''}
                </Text>
                <Text style={styles.reqLinePreview} numberOfLines={1}>
                  {buildRequestSubmissionPreview(r)}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={TrustfallColors.muted} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  menuBtn: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuModalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  menuSheet: {
    position: 'absolute',
    top: 56,
    right: TrustfallSpacing.lg,
    minWidth: 200,
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
    overflow: 'hidden',
  },
  menuRow: {
    paddingVertical: TrustfallSpacing.md,
    paddingHorizontal: TrustfallSpacing.lg,
  },
  menuRowDanger: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: TrustfallColors.border,
  },
  menuRowText: {
    fontSize: 16,
    fontWeight: '600',
    color: TrustfallColors.foreground,
  },
  menuRowTextDanger: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f87171',
  },
  safe: { flex: 1, backgroundColor: TrustfallColors.background },
  scroll: { padding: TrustfallSpacing.lg, paddingBottom: 100, gap: TrustfallSpacing.lg },
  loader: { paddingVertical: TrustfallSpacing.xxl },
  signedOutCard: {
    padding: TrustfallSpacing.xl,
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
    gap: TrustfallSpacing.md,
  },
  signedOutTitle: { fontSize: 18, fontWeight: '700', color: TrustfallColors.foreground },
  signedOutBtn: {
    alignSelf: 'flex-start',
    paddingVertical: TrustfallSpacing.sm,
    paddingHorizontal: TrustfallSpacing.lg,
    borderRadius: TrustfallRadius.md,
    backgroundColor: TrustfallColors.primary,
  },
  signedOutBtnText: { fontSize: 15, fontWeight: '700', color: TrustfallColors.primaryForeground },
  userRow: { flexDirection: 'row', gap: TrustfallSpacing.lg, alignItems: 'center' },
  userTextCol: { flex: 1, minWidth: 0, gap: 4 },
  metaLine: { fontSize: 13, color: TrustfallColors.muted },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: TrustfallColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPressed: { opacity: 0.88 },
  avatarDisabled: { opacity: 0.7 },
  avatarImage: { ...StyleSheet.absoluteFillObject },
  avatarSpinner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: TrustfallColors.primaryForeground },
  name: { fontSize: 20, fontWeight: '700', color: TrustfallColors.foreground },
  email: { fontSize: 14, color: TrustfallColors.muted },
  city: { fontSize: 12, color: TrustfallColors.muted },
  stats: { flexDirection: 'row', gap: TrustfallSpacing.sm },
  statCard: {
    flex: 1,
    padding: TrustfallSpacing.lg,
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '700', color: TrustfallColors.foreground },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '700',
    color: TrustfallColors.accent,
  },
  prefNavCard: {
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
  },
  prefNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TrustfallSpacing.md,
    paddingVertical: TrustfallSpacing.lg,
    paddingHorizontal: TrustfallSpacing.lg,
  },
  prefNavBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  prefNavTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: TrustfallColors.foreground,
  },
  prefNavSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: TrustfallColors.muted,
  },
  prefNavDivider: {
    marginLeft: TrustfallSpacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: TrustfallColors.border,
  },
  muted: { fontSize: 14, color: TrustfallColors.muted },
  reqLineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TrustfallSpacing.md,
    paddingVertical: TrustfallSpacing.md,
    paddingHorizontal: TrustfallSpacing.lg,
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
  },
  reqLineBody: { flex: 1, minWidth: 0, gap: 2 },
  reqLineTitle: { fontSize: 15, fontWeight: '600', color: TrustfallColors.foreground },
  reqLineMeta: { fontSize: 12, color: TrustfallColors.muted },
  reqLinePreview: { fontSize: 13, color: TrustfallColors.secondary },
})
