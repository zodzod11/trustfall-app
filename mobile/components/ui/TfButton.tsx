import { Pressable, StyleSheet, Text, type PressableProps, type TextStyle, type ViewStyle } from 'react-native'
import { TrustfallColors, TrustfallRadius, TrustfallSpacing } from '@/constants/trustfall-theme'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'default' | 'compact'

type TfButtonProps = PressableProps & {
  title: string
  variant?: Variant
  /** Compact padding for toolbars or dense rows (e.g. Match Attach / Photo / Saved). */
  size?: Size
  /** Use 2 in tight grid CTAs so short labels like “Request” don’t ellipsize. */
  titleNumberOfLines?: number
  style?: ViewStyle
  textStyle?: TextStyle
}

export function TfButton({
  title,
  variant = 'primary',
  size = 'default',
  titleNumberOfLines = 1,
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
        size === 'compact' && styles.compact,
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
        numberOfLines={titleNumberOfLines}
        ellipsizeMode="tail"
        style={[
          styles.label,
          size === 'compact' && styles.labelCompact,
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
  compact: {
    minHeight: 44,
    paddingHorizontal: TrustfallSpacing.md,
    paddingVertical: TrustfallSpacing.sm,
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
    textAlign: 'center',
  },
  labelCompact: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
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
