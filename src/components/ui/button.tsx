import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme/tokens';

export interface ButtonProps {
  children?: React.ReactNode;
  variant?: 'default' | 'secondary' | 'ghost' | 'outline' | 'destructive' | 'success' | 'warning';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  onClick?: () => void;
  onPress?: () => void;
  className?: string;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'default',
  children,
  style,
  textStyle,
  onClick,
  onPress,
  disabled,
}) => {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  const labelStyle = variantTextStyles[variant];
  return (
    <TouchableOpacity
      style={[styles.button, sizeStyle, variantStyle, disabled && styles.disabled, style]}
      onPress={onPress || onClick}
      disabled={disabled}
      activeOpacity={0.7}>
      {typeof children === 'string' ? (
        <Text style={[styles.buttonText, labelStyle, textStyle]}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    ...shadows.card,
  },
  buttonText: {
    fontFamily: typography.family,
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    fontWeight: typography.weight.semibold,
  },
  disabled: { opacity: 0.5, elevation: 0, shadowOpacity: 0 },
});

const variantStyles = StyleSheet.create({
  default: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.secondary },
  ghost: { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 },
  outline: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.input, elevation: 0, shadowOpacity: 0 },
  destructive: { backgroundColor: colors.destructive },
  success: { backgroundColor: colors.success },
  warning: { backgroundColor: colors.warning },
});

const variantTextStyles: Record<NonNullable<ButtonProps['variant']>, TextStyle> = StyleSheet.create({
  default: { color: colors.surface },
  secondary: { color: colors.foreground },
  ghost: { color: colors.primaryDark },
  outline: { color: colors.foreground },
  destructive: { color: colors.surface },
  success: { color: colors.surface },
  warning: { color: colors.surface },
});

const sizeStyles = StyleSheet.create({
  default: {},
  sm: { minHeight: 36, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  lg: { minHeight: 44, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  icon: { width: 40, minHeight: 40, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
});
