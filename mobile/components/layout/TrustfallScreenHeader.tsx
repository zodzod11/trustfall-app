import { BlurView } from 'expo-blur'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { type ReactNode } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { TrustfallColors, TrustfallSpacing } from '@/constants/trustfall-theme'

type Props = {
  title: string
  subtitle?: string
  /** Left slot (e.g. brand or back). Use a spacer View for alignment if empty. */
  left?: ReactNode
  /** Right slot (e.g. search). Use a spacer View if empty. */
  right?: ReactNode
}

/** Side columns — room for brand + compact actions (e.g. Search). */
const SLOT_W = 72

export function TrustfallScreenHeader({ title, subtitle, left, right }: Props) {
  return (
    <View style={styles.wrap}>
      {Platform.OS === 'web' ? (
        <View style={[StyleSheet.absoluteFillObject, styles.webBackdrop]} pointerEvents="none" />
      ) : (
        <BlurView
          intensity={42}
          tint="dark"
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      )}
      <View style={styles.inner} pointerEvents="box-none">
        <View style={styles.slot}>{left ?? <View style={{ width: SLOT_W }} />}</View>
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.slot}>{right ?? <View style={{ width: SLOT_W }} />}</View>
      </View>
    </View>
  )
}

/** Home mark — same asset as web `public/logo.png` (bundled for native). */
export function TrustfallBrandMark() {
  return (
    <Pressable
      onPress={() => router.push('/explore')}
      style={styles.brandMark}
      accessibilityRole="button"
      accessibilityLabel="Trustfall home"
    >
      <Image
        source={require('@/assets/images/trustfall-logo.png')}
        style={styles.brandImage}
        contentFit="contain"
        accessibilityIgnoresInvertColors
      />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  webBackdrop: {
    backgroundColor: 'rgba(11, 19, 38, 0.82)',
    backdropFilter: 'blur(24px)' as never,
  },
  inner: {
    position: 'relative',
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TrustfallSpacing.lg,
    paddingVertical: TrustfallSpacing.md,
    gap: TrustfallSpacing.sm,
  },
  slot: {
    width: SLOT_W,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: TrustfallColors.primary,
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: TrustfallColors.muted,
  },
  brandMark: {
    width: SLOT_W,
    minHeight: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  brandImage: {
    width: SLOT_W,
    height: 32,
  },
})
