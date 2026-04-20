import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs'
import { PlatformPressable } from '@react-navigation/elements'
import * as Haptics from 'expo-haptics'
import { Platform, StyleSheet, View } from 'react-native'
import { tabStrongLuminous } from '@/constants/navigationGlass'
import { useNavigationGlass } from '@/contexts/NavigationGlassContext'

/**
 * Strong variant: luminous solid pill behind the active tab (not a second blur).
 */
export function LiquidGlassTabButton(props: BottomTabBarButtonProps) {
  const { variant } = useNavigationGlass()
  const selected = props.accessibilityState?.selected === true

  return (
    <View style={styles.slot}>
      {variant === 'strong' && selected ? (
        <View
          style={[styles.luminous, Platform.OS === 'ios' ? styles.luminousShadowIos : null]}
          pointerEvents="none"
        />
      ) : null}
      <PlatformPressable
        {...props}
        style={[props.style, styles.pressable]}
        onPressIn={(ev) => {
          if (process.env.EXPO_OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          }
          props.onPressIn?.(ev)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  luminous: {
    position: 'absolute',
    width: tabStrongLuminous.width,
    height: tabStrongLuminous.height,
    borderRadius: tabStrongLuminous.borderRadius,
    backgroundColor: tabStrongLuminous.background,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: tabStrongLuminous.border,
  },
  luminousShadowIos: {
    shadowColor: '#2f63e6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  pressable: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
})
