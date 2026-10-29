import React, { useRef } from 'react';
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewStyle,
} from 'react-native';
import { radii } from '../../theme/tokens';
import { AnimatedLiquidBorder } from './AnimatedLiquidBorder';
import { createTapGestureHandlers } from '../../utils/tapGestureHandlers';
import {
  createLiquidBorderFocusId,
  useLiquidBorderFocus,
} from './LiquidBorderFocusContext';

interface SurfaceProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
}

/** Drop-in touch-focused surface for website card equivalents. */
export const LiquidBorderSurface: React.FC<SurfaceProps> = ({
  children,
  style,
  radius,
}) => {
  const idRef = useRef<string | null>(null);
  if (!idRef.current) idRef.current = createLiquidBorderFocusId('liquid-surface');
  const id = idRef.current;
  const focus = useLiquidBorderFocus(id);
  const tapHandlers = createTapGestureHandlers(() => focus.focus(id));
  const styleRadius = StyleSheet.flatten(style)?.borderRadius;
  const borderRadius =
    typeof styleRadius === 'number'
      ? styleRadius
      : typeof radius === 'number'
        ? radius
        : radii.lg;
  return (
    <View style={style} {...tapHandlers}>
      {children}
      <AnimatedLiquidBorder active={focus.focused} radius={borderRadius} />
    </View>
  );
};

interface TouchableSurfaceProps extends TouchableOpacityProps {
  radius?: number;
}

export const LiquidBorderTouchable: React.FC<TouchableSurfaceProps> = ({
  children,
  style,
  radius,
  onPressIn,
  onPress,
  ...props
}) => {
  const idRef = useRef<string | null>(null);
  if (!idRef.current) idRef.current = createLiquidBorderFocusId('liquid-touchable');
  const id = idRef.current;
  const focus = useLiquidBorderFocus(id);
  const styleRadius = StyleSheet.flatten(style)?.borderRadius;
  const borderRadius =
    typeof styleRadius === 'number'
      ? styleRadius
      : typeof radius === 'number'
        ? radius
        : radii.lg;
  return (
    <TouchableOpacity
      {...props}
      style={style}
      onPress={event => {
        focus.focus(id);
        onPress?.(event);
      }}
      onPressIn={event => {
        onPressIn?.(event);
      }}>
      {children}
      <AnimatedLiquidBorder active={focus.focused} radius={borderRadius} />
    </TouchableOpacity>
  );
};
