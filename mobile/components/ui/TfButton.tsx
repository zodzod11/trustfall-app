import { Pressable, StyleSheet, Text, type PressableProps, type TextStyle, type ViewStyle } from 'react-native'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'

type Variant = 'primary' | 'secondary' | 'ghost'

type TfButtonProps = PressableProps & {
  title: string
  variant?: Variant
  style?: ViewStyle
  textStyle?: TextStyle
}

export function TfButton({
  title,
  variant = 'primary',
  style,
  textStyle,
  disabled,
  ...rest
}: TfButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
      {...rest}
    >
      <Text
        style={[
          styles.label,
          variant === 'primary' && styles.labelPrimary,
          variant === 'secondary' && styles.labelSecondary,
          variant === 'ghost' && styles.labelGhost,
          textStyle,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: TrustfallSpacing.xxl,
    borderRadius: TrustfallRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: TrustfallColors.primary,
  },
  secondary: {
    backgroundColor: TrustfallColors.surfaceElevated,
    borderWidth: 1,
    borderColor: TrustfallColors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.88,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  labelPrimary: {
    color: TrustfallColors.primaryForeground,
  },
  labelSecondary: {
    color: TrustfallColors.foreground,
  },
  labelGhost: {
    color: TrustfallColors.muted,
  },
})
