import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { BottomTabBar } from '@react-navigation/bottom-tabs'
import { Platform, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LiquidGlassSurface } from '@/components/navigation/LiquidGlassSurface'
import { getTabBarAndroidTint } from '@/constants/navigationGlass'
import { useNavigationGlassOptional } from '@/contexts/NavigationGlassContext'

/**
 * Floating bottom tab bar — Liquid Glass shell tiers (control = baseline blur pill).
 */
export function TrustfallTabBar(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const bottom = Math.max(insets.bottom, 10)
  const { variant } = useNavigationGlassOptional()

  return (
    <View style={[styles.outer, { paddingBottom: bottom }]}>
      <LiquidGlassSurface variant={variant} style={{ width: '100%' }} contentStyle={styles.glassInner}>
        <View
          style={[
            styles.androidTint,
            Platform.OS === 'android' && {
              backgroundColor: getTabBarAndroidTint(variant),
            },
          ]}
        >
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
      </LiquidGlassSurface>
    </View>
  )
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 14,
    paddingTop: 6,
    backgroundColor: 'transparent',
  },
  glassInner: {
    overflow: 'hidden',
  },
  androidTint: {
    backgroundColor: 'transparent',
  },
})
