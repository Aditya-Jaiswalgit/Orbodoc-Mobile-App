import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  FeComposite,
  FeFlood,
  FeGaussianBlur,
  FeMerge,
  FeMergeNode,
  Filter,
  LinearGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { useLiquidBorderAnimationController } from './LiquidBorderFocusContext';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
let nextGradientId = 0;
const WEBSITE_BORDER_WIDTH = 2;
const WEBSITE_BORDER_OUTSET = 1;
const WEBSITE_SHADOW_BLUR = 7;
const WEBSITE_SHADOW_BLEED = WEBSITE_SHADOW_BLUR * 3;

interface Props {
  active: boolean;
  radius?: number;
  glow?: boolean;
}

/** SVG border overlay matching the website's flowing teal/mint card outline. */
export const AnimatedLiquidBorder: React.FC<Props> = ({
  active,
  radius = 14,
  glow = true,
}) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const controller = useLiquidBorderAnimationController();
  const progressValue = useRef(0);
  const wasActive = useRef(false);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const gradientIdRef = useRef<string | null>(null);
  if (!gradientIdRef.current) gradientIdRef.current = `orbo-liquid-border-${++nextGradientId}`;
  const gradientId = gradientIdRef.current;
  const filterId = `${gradientId}-shadow`;
  const bleed = glow
    ? WEBSITE_BORDER_OUTSET + WEBSITE_SHADOW_BLEED
    : WEBSITE_BORDER_OUTSET;
  useEffect(() => {
    const listenerId = progress.addListener(({ value }) => {
      progressValue.current = value;
    });
    return () => progress.removeListener(listenerId);
  }, [progress]);

  useEffect(() => {
    if (!active || !size.width || !size.height) {
      progress.stopAnimation(value => { progressValue.current = value; });
      opacity.stopAnimation();
      progress.setValue(0);
      opacity.setValue(0);
      wasActive.current = false;
      return;
    }

    if (!wasActive.current) {
      progress.setValue(0);
      progressValue.current = 0;
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      wasActive.current = true;
    }

    let cancelled = false;
    let isRunning = false;
    const animateToNextBoundary = () => {
      if (cancelled || isRunning) return;
      isRunning = true;
      const remaining = Math.max(1, 2200 * (1 - progressValue.current));
      const animation = Animated.timing(progress, {
        toValue: 1,
        duration: remaining,
        useNativeDriver: false,
      });
      animationRef.current = animation;
      animation.start(({ finished }) => {
        isRunning = false;
        animationRef.current = null;
        if (!finished || cancelled) return;
        progress.setValue(0);
        progressValue.current = 0;
        animateToNextBoundary();
      });
    };
    const pause = () => {
      if (!isRunning) return;
      animationRef.current?.stop();
      animationRef.current = null;
      isRunning = false;
      progress.stopAnimation(value => { progressValue.current = value; });
    };
    const resume = () => {
      if (cancelled || isRunning) return;
      animateToNextBoundary();
    };
    animateToNextBoundary();
    const unregisterAnimation = controller.registerBorderAnimation(gradientId, pause, resume);
    return () => {
      cancelled = true;
      unregisterAnimation();
      animationRef.current?.stop();
      animationRef.current = null;
    };
  }, [active, controller, gradientId, opacity, progress, size.height, size.width]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== size.width || height !== size.height) setSize({ width, height });
  };
  if (!active) return null;

  // The website animates background-position from 0% to 300% on a 300% wide
  // pseudo-element. CSS position percentages translate it by six box widths.
  const borderBoxWidth = Math.max(0, size.width - 2 * (bleed - WEBSITE_BORDER_OUTSET));
  const borderBoxHeight = Math.max(0, size.height - 2 * (bleed - WEBSITE_BORDER_OUTSET));
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -borderBoxWidth * 6],
  });
  // CSS 115deg (clockwise from the top edge) flows down and right. Match the
  // diagonal endpoints across the 300% by 300% CSS gradient box.
  const gradientBoxWidth = borderBoxWidth * 3;
  const gradientBoxHeight = borderBoxHeight * 3;
  const directionX = Math.sin((115 * Math.PI) / 180);
  const directionY = -Math.cos((115 * Math.PI) / 180);
  const halfGradientLength = Math.min(
    gradientBoxWidth / (2 * directionX),
    gradientBoxHeight / (2 * directionY),
  );
  const gradientWidth = halfGradientLength * 2 * directionX;
  const gradientHeight = halfGradientLength * 2 * directionY;
  const x1 = Animated.add(
    translateX,
    bleed - WEBSITE_BORDER_OUTSET + (gradientBoxWidth - gradientWidth) / 2,
  );
  const x2 = Animated.add(x1, gradientWidth);
  // CSS background-position is 50% vertically, which offsets the 300% image
  // upward by one surface height.
  const y1 =
    bleed - WEBSITE_BORDER_OUTSET +
    (gradientBoxHeight - gradientHeight) / 2 - borderBoxHeight;
  const y2 = y1 + gradientHeight;

  return (
    <View
      pointerEvents="none"
      onLayout={onLayout}
      style={[
        styles.overlay,
        { top: -bleed, right: -bleed, bottom: -bleed, left: -bleed, borderRadius: radius },
      ]}
    >
      {size.width > 0 && size.height > 0 ? (
        <Animated.View style={[styles.svg, { opacity }]}>
          <Svg width={size.width} height={size.height}>
            <Defs>
              {glow ? (
                <Filter
                  id={filterId}
                  x={0}
                  y={0}
                  width={size.width}
                  height={size.height}
                  filterUnits="userSpaceOnUse">
                  <FeGaussianBlur in="SourceAlpha" stdDeviation={WEBSITE_SHADOW_BLUR} result="blur" />
                  <FeFlood floodColor="#2dd4bf" floodOpacity={0.35} result="tint" />
                  <FeComposite in="tint" in2="blur" operator="in" result="shadow" />
                  <FeMerge>
                    <FeMergeNode in="shadow" />
                    <FeMergeNode in="SourceGraphic" />
                  </FeMerge>
                </Filter>
              ) : null}
              <AnimatedLinearGradient
                id={gradientId}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor="#0f766e" />
                <Stop offset="0.333333" stopColor="#6ee7d2" />
                <Stop offset="0.666667" stopColor="#2dd4bf" />
                <Stop offset="1" stopColor="#0f766e" />
              </AnimatedLinearGradient>
            </Defs>
            {/* Match the website's one-unit outset and two-unit masked perimeter. */}
            <Rect
              x={bleed}
              y={bleed}
              width={Math.max(0, size.width - 2 * bleed)}
              height={Math.max(0, size.height - 2 * bleed)}
              rx={Math.max(0, radius - WEBSITE_BORDER_OUTSET)}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={WEBSITE_BORDER_WIDTH}
              filter={glow ? `url(#${filterId})` : undefined}
            />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    zIndex: 4,
  },
  svg: { ...StyleSheet.absoluteFill },
});
