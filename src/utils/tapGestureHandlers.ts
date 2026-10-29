import { ViewProps } from 'react-native';

type TouchStartEvent = Parameters<NonNullable<ViewProps['onTouchStart']>>[0];
type TouchMoveEvent = Parameters<NonNullable<ViewProps['onTouchMove']>>[0];

type TapGestureHandlers = Pick<
  ViewProps,
  'onTouchStart' | 'onTouchMove' | 'onTouchEnd' | 'onTouchCancel'
>;

/** Treat a touch as a tap only when it stays in place, so scrolling doesn't
 * activate persistent pressed/focus effects on the surface underneath it. */
export const createTapGestureHandlers = (onTap: () => void): TapGestureHandlers => {
  let startX = 0;
  let startY = 0;
  let started = false;
  let moved = false;

  const readPoint = (event: TouchStartEvent | TouchMoveEvent) => {
    const touch = event.nativeEvent.touches?.[0] ?? event.nativeEvent.changedTouches?.[0];
    return touch ? { x: touch.pageX, y: touch.pageY } : null;
  };

  return {
    onTouchStart: event => {
      const point = readPoint(event);
      if (!point) return;
      startX = point.x;
      startY = point.y;
      started = true;
      moved = false;
    },
    onTouchMove: event => {
      if (!started || moved) return;
      const point = readPoint(event);
      if (point && (Math.abs(point.x - startX) > 8 || Math.abs(point.y - startY) > 8)) {
        moved = true;
      }
    },
    onTouchEnd: () => {
      if (started && !moved) onTap();
      started = false;
    },
    onTouchCancel: () => {
      started = false;
    },
  };
};

