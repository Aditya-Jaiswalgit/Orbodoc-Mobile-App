import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { colors, radii, spacing, statusColors, typography } from '../../theme/tokens';

export interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'outline' | 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', style, textStyle }) => {
  const variantStyle = variantStyles[variant];
  const variantTextStyle = variantTextStyles[variant];
  return (
    <View style={[styles.badge, variantStyle, style]}>
      {typeof children === 'string' ? (
        <Text style={[styles.badgeText, variantTextStyle, textStyle]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: statusColors.neutral.background,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: typography.family,
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.compact,
    fontWeight: typography.weight.semibold,
    color: statusColors.neutral.foreground,
  },
});

const variantStyles = StyleSheet.create({
  default: { borderColor: colors.primary, backgroundColor: colors.primary },
  secondary: { borderColor: colors.mintBorder, backgroundColor: colors.mint },
  outline: { borderColor: colors.border, backgroundColor: colors.surface },
  destructive: { borderColor: colors.destructive, backgroundColor: colors.destructive },
  success: { borderColor: colors.successSoft, backgroundColor: colors.successSoft },
  warning: { borderColor: colors.warningSoft, backgroundColor: colors.warningSoft },
  info: { borderColor: colors.infoSoft, backgroundColor: colors.infoSoft },
});

const variantTextStyles: Record<NonNullable<BadgeProps['variant']>, TextStyle> = StyleSheet.create({
  default: { color: colors.surface },
  secondary: { color: colors.primaryDark },
  outline: { color: colors.foreground },
  destructive: { color: colors.surface },
  success: { color: statusColors.success.foreground },
  warning: { color: statusColors.warning.foreground },
  info: { color: statusColors.info.foreground },
});
