import React, { useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme/tokens';
import { AnimatedLiquidBorder } from './AnimatedLiquidBorder';
import { createLiquidBorderFocusId, useLiquidBorderFocus } from './LiquidBorderFocusContext';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  iconBgColor?: string;
  cardBgColor?: string;
  borderColor?: string;
  textColor?: string;
  onPress?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  iconBgColor = colors.mint,
  cardBgColor = colors.surface,
  borderColor = colors.border,
  textColor = colors.text,
  onPress,
}) => {
  const cardIdRef = useRef<string | null>(null);
  if (!cardIdRef.current) cardIdRef.current = createLiquidBorderFocusId('stat-card');
  const cardId = cardIdRef.current;
  const focus = useLiquidBorderFocus(cardId);
  const focused = focus.focused;
  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: cardBgColor, borderColor },
      ]}
      onPress={() => {
        focus.focus(cardId);
        onPress?.();
      }}
      activeOpacity={0.8}
      accessibilityRole={onPress ? 'button' : undefined}>
      <AnimatedLiquidBorder active={focused} radius={radii.lg} />
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        {icon}
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.valueText, { color: textColor }]}>{value}</Text>
        <Text style={styles.titleText}>{title}</Text>
        {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  valueText: {
    fontFamily: typography.family, color: colors.text,
    fontSize: typography.size.title,
    fontWeight: typography.weight.extrabold,
  },
  titleText: {
    fontFamily: typography.family, color: colors.muted,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    marginTop: spacing.xxs,
  },
  subtitleText: {
    fontFamily: typography.family, color: colors.subtle,
    fontSize: typography.size.xs,
    marginTop: spacing.xxs,
  },
});

export default StatCard;
