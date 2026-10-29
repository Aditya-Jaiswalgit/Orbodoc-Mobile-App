import React, { forwardRef, useMemo } from 'react';
import {
  ScrollView as NativeScrollView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from 'react-native';
import { useLiquidBorderScrollHandlers } from './LiquidBorderFocusContext';

type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;

/** ScrollView that temporarily pauses active liquid borders during drag/momentum. */
export const LiquidBorderScrollView = forwardRef<
  React.ElementRef<typeof NativeScrollView>,
  ScrollViewProps
>(function LiquidBorderScrollViewImpl({
  onScrollBeginDrag,
  onScrollEndDrag,
  onMomentumScrollBegin,
  onMomentumScrollEnd,
  ...props
}, ref) {
  const borderHandlers = useLiquidBorderScrollHandlers();

  const handlers = useMemo(() => ({
    onScrollBeginDrag: (event: ScrollEvent) => {
      borderHandlers.onScrollBeginDrag?.(event);
      onScrollBeginDrag?.(event);
    },
    onScrollEndDrag: (event: ScrollEvent) => {
      borderHandlers.onScrollEndDrag?.(event);
      onScrollEndDrag?.(event);
    },
    onMomentumScrollBegin: (event: ScrollEvent) => {
      borderHandlers.onMomentumScrollBegin?.(event);
      onMomentumScrollBegin?.(event);
    },
    onMomentumScrollEnd: (event: ScrollEvent) => {
      borderHandlers.onMomentumScrollEnd?.(event);
      onMomentumScrollEnd?.(event);
    },
  }), [borderHandlers, onMomentumScrollBegin, onMomentumScrollEnd, onScrollBeginDrag, onScrollEndDrag]);

  return <NativeScrollView ref={ref} {...props} {...handlers} />;
});

LiquidBorderScrollView.displayName = 'LiquidBorderScrollView';
