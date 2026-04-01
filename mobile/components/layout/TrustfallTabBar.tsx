import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { BottomTabBar } from '@react-navigation/bottom-tabs'
import { BlurView } from 'expo-blur'
import { Platform, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TrustfallColors, TrustfallRadius } from '@/constants/trustfall-theme'

/**
 * Floating, blurred bottom tab bar (iOS-style glass; solid fallback on web).
 */
export function TrustfallTabBar(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const bottom = Math.max(insets.bottom, 10)

  return (
    <View style={[styles.outer, { paddingBottom: bottom }]}>
      <View style={styles.pill}>
        {Platform.OS === 'web' ? (
          <View style={[StyleSheet.absoluteFillObject, styles.webFallback]} />
        ) : (
          <BlurView
            intensity={Platform.OS === 'ios' ? 52 : 72}
            tint="dark"
            style={StyleSheet.absoluteFillObject}
          />
        )}
        <View style={styles.androidTint}>
          <BottomTabBar
            {...props}
            style={{
              backgroundColor: 'transparent',
              borderTopWidth: 0,
              elevation: 0,
              height: 54,
              paddingTop: 4,
              paddingBottom: 2,
            }}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 14,
    paddingTop: 6,
    backgroundColor: 'transparent',
  },
  pill: {
    borderRadius: TrustfallRadius.xl + 6,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
      android: {
        elevation: 18,
      },
      default: {},
    }),
  },
  webFallback: {
    backgroundColor: 'rgba(15, 22, 42, 0.88)',
    backdropFilter: 'blur(20px)' as never,
  },
  androidTint: {
    backgroundColor: Platform.OS === 'android' ? 'rgba(11, 19, 38, 0.55)' : 'transparent',
  },
})
