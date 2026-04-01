import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useState } from 'react'
import {
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
import { TrustfallBrandMark, TrustfallScreenHeader } from '@/components/layout/TrustfallScreenHeader'
import { usersSeed } from '@/data/seed'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'
import { useSaved } from '@/hooks/useSaved'
import { supabase } from '@/lib/supabase'

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
  const user = usersSeed[0]
  const { savedPortfolioItemIds, savedProfessionalIds, requestSubmissions } = useSaved()
  const recentRequests = requestSubmissions.slice(0, 4)

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TrustfallScreenHeader
        title="Profile"
        subtitle="Account"
        left={<TrustfallBrandMark />}
        right={<ProfileAccountMenu />}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.firstName[0]}
              {user.lastName[0]}
            </Text>
          </View>
          <View>
            <Text style={styles.name}>
              {user.firstName} {user.lastName}
            </Text>
            <Text style={styles.email}>{user.email}</Text>
            <Text style={styles.city}>{user.city}</Text>
          </View>
        </View>

        <View style={styles.stats}>
          {[
            { label: 'Saved looks', value: savedPortfolioItemIds.length },
            { label: 'Saved pros', value: savedProfessionalIds.length },
            { label: 'Requests', value: requestSubmissions.length },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={styles.prefCard}>
          <View style={styles.tagRow}>
            {user.preferredCategories.map((c) => (
              <View key={c} style={styles.tag}>
                <Text style={styles.tagText}>{c}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.budget}>
            Budget: ${user.budgetMin} – ${user.budgetMax}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Recent requests</Text>
        {recentRequests.length === 0 ? (
          <Text style={styles.muted}>No requests yet. Send one from Match results or Explore.</Text>
        ) : (
          recentRequests.map((r) => (
            <View key={r.createdAt + r.portfolioItemId} style={styles.reqCard}>
              <View style={styles.reqTopRow}>
                {r.portfolioImageUrl ? (
                  <Image source={{ uri: r.portfolioImageUrl }} style={styles.reqThumb} />
                ) : (
                  <View style={styles.reqThumb} />
                )}
                <View style={styles.reqBody}>
                  <Text style={styles.reqPro}>{r.proName}</Text>
                  {(r.clientName || r.clientEmail) ? (
                    <Text style={styles.reqMeta}>
                      {r.clientName} · {r.clientEmail}
                    </Text>
                  ) : null}
                  <Text style={styles.reqMsg} numberOfLines={2}>
                    {r.message}
                  </Text>
                </View>
              </View>
              {(r.inspirationUri || r.currentPhotoUri) ? (
                <View style={styles.reqUserPhotos}>
                  {r.inspirationUri ? (
                    <View style={styles.reqUserPhotoWrap}>
                      <Text style={styles.reqUserPhotoLabel}>Inspiration</Text>
                      <Image
                        source={{ uri: r.inspirationUri }}
                        style={styles.reqUserPhotoImg}
                        contentFit="cover"
                      />
                    </View>
                  ) : null}
                  {r.currentPhotoUri ? (
                    <View style={styles.reqUserPhotoWrap}>
                      <Text style={styles.reqUserPhotoLabel}>Your photo</Text>
                      <Image
                        source={{ uri: r.currentPhotoUri }}
                        style={styles.reqUserPhotoImg}
                        contentFit="cover"
                      />
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  menuBtn: {
    width: 44,
    height: 40,
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
  userRow: { flexDirection: 'row', gap: TrustfallSpacing.lg, alignItems: 'center' },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: TrustfallColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
  prefCard: {
    padding: TrustfallSpacing.lg,
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
    gap: TrustfallSpacing.md,
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
  budget: { fontSize: 14, color: TrustfallColors.secondary },
  muted: { fontSize: 14, color: TrustfallColors.muted },
  reqCard: {
    gap: TrustfallSpacing.md,
    padding: TrustfallSpacing.lg,
    borderRadius: TrustfallRadius.lg,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
    backgroundColor: TrustfallColors.surface,
  },
  reqTopRow: { flexDirection: 'row', gap: TrustfallSpacing.md },
  reqUserPhotos: { flexDirection: 'row', gap: TrustfallSpacing.sm },
  reqUserPhotoWrap: { flex: 1, minWidth: 0, gap: 4 },
  reqUserPhotoLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  reqUserPhotoImg: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: TrustfallRadius.md,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  reqThumb: {
    width: 56,
    height: 64,
    borderRadius: TrustfallRadius.md,
    backgroundColor: TrustfallColors.surfaceElevated,
  },
  reqBody: { flex: 1, minWidth: 0, gap: 4 },
  reqPro: { fontSize: 15, fontWeight: '600', color: TrustfallColors.secondary },
  reqMeta: { fontSize: 11, color: TrustfallColors.muted },
  reqMsg: { fontSize: 13, color: TrustfallColors.muted },
})
