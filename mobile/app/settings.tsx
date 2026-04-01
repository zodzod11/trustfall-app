import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TfButton } from '@/components/ui/TfButton'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'
import { supabase } from '@/lib/supabase'

export default function SettingsScreen() {
  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/welcome')
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={['#0b1326', '#121a2e']} style={StyleSheet.absoluteFill} />
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backWrap}>
          <Text style={styles.back}>← Profile</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.topSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.body}>
          Manage your Trustfall session. More options will appear here as the product grows.
        </Text>
        <TfButton title="Sign out" variant="secondary" onPress={() => void signOut()} />
      </ScrollView>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backWrap: { minWidth: 88 },
  back: { fontSize: 15, color: TrustfallColors.accent, fontWeight: '600' },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: TrustfallColors.primary,
    letterSpacing: -0.3,
  },
  topSpacer: { minWidth: 88 },
  scroll: {
    padding: TrustfallSpacing.xxl,
    paddingBottom: 100,
    gap: TrustfallSpacing.lg,
  },
  body: { fontSize: 15, lineHeight: 22, color: TrustfallColors.muted },
})
