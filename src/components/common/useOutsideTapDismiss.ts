import { RefObject, useCallback, useEffect, useRef } from 'react';
import { GestureResponderEvent, View } from 'react-native';

type ScreenRect = { x: number; y: number; width: number; height: number };

export interface OutsideTapTarget {
  /** Stable id for this open dropdown, calendar, or action popover. */
  id: string;
  open: boolean;
  /** Keep both the trigger and the popup refs here so taps inside either are retained. */
  refs: Array<RefObject<View | null>>;
  dismiss: () => void;
}

/**
 * Invisible, UI-neutral outside-tap handler for inline popovers.
 * Attach `onTouchStartCapture` to a screen root; it never becomes the touch
 * responder, so buttons, inputs and ScrollViews continue to behave normally.
 */
export const useOutsideTapDismiss = (targets: OutsideTapTarget[]) => {
  const boundsRef = useRef<Record<string, ScreenRect[]>>({});

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const next: Record<string, ScreenRect[]> = {};
      targets.forEach((target) => {
        if (!target.open) return;
        const activeRefs = target.refs.filter((ref) => Boolean(ref.current));
        let pending = activeRefs.length;
        const rects: ScreenRect[] = [];
        if (!pending) {
          boundsRef.current = { ...boundsRef.current, [target.id]: [] };
          return;
        }
        activeRefs.forEach((ref) => {
          ref.current!.measureInWindow((x, y, width, height) => {
            if (width > 0 && height > 0) rects.push({ x, y, width, height });
            pending -= 1;
            if (pending === 0) {
              next[target.id] = rects;
              boundsRef.current = { ...boundsRef.current, ...next };
            }
          });
        });
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [targets]);

  return useCallback((event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    targets.forEach((target) => {
      if (!target.open) return;
      const inside = (boundsRef.current[target.id] || []).some((rect) => (
        pageX >= rect.x && pageX <= rect.x + rect.width && pageY >= rect.y && pageY <= rect.y + rect.height
      ));
      if (!inside) target.dismiss();
    });
  }, [targets]);
};
