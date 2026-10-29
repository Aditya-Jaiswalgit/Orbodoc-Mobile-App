import React, { useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, radii, shadows, spacing } from '../../theme/tokens';
import { AnimatedLiquidBorder } from '../common/AnimatedLiquidBorder';
import { createLiquidBorderFocusId, useLiquidBorderFocus } from '../common/LiquidBorderFocusContext';
import { createTapGestureHandlers } from '../../utils/tapGestureHandlers';

export interface CardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  onClick?: () => void;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, style, onClick, onPress }) => {
  const handlePress = onPress || onClick;
  const cardIdRef = useRef<string | null>(null);
  if (!cardIdRef.current) cardIdRef.current = createLiquidBorderFocusId('shared-card');
  const cardId = cardIdRef.current;
  const focus = useLiquidBorderFocus(cardId);
  const focused = focus.focused;
  const tapHandlers = createTapGestureHandlers(() => focus.focus(cardId));
  const contents = <>
    {children}
    <AnimatedLiquidBorder active={focused} radius={radii.lg} />
  </>;
  if (handlePress) {
    return (
      <TouchableOpacity
        style={[styles.card, style]}
        onPress={() => {
          focus.focus(cardId);
          handlePress();
        }}
        activeOpacity={0.7}
        accessibilityRole="button">
        {contents}
      </TouchableOpacity>
    );
  }
  return (
    <View style={[styles.card, style]} {...tapHandlers}>
      {contents}
    </View>
  );
};

export interface CardContentProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, style }) => {
  return <View style={[styles.content, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  content: {
    padding: spacing.lg,
  },
});
