import React, {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollViewProps } from 'react-native';

type Listener = () => void;

interface FocusStore {
  focus: (id: string) => void;
  isFocused: (id: string) => boolean;
  subscribe: (id: string, listener: Listener) => () => void;
  beginScroll: (id: string) => void;
  endScroll: (id: string) => void;
  registerBorderAnimation: (id: string, pause: () => void, resume: () => void) => () => void;
}

const emptyStore: FocusStore = {
  focus: () => undefined,
  isFocused: () => false,
  subscribe: () => () => undefined,
  beginScroll: () => undefined,
  endScroll: () => undefined,
  registerBorderAnimation: () => () => undefined,
};

const Context = createContext<FocusStore>(emptyStore);
let nextId = 0;

export const createLiquidBorderFocusId = (prefix: string) => `${prefix}-${++nextId}`;

export const LiquidBorderFocusProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const store = useMemo<FocusStore>(() => {
    let activeId: string | null = null;
    const listeners = new Map<string, Set<Listener>>();
    const scrollingIds = new Set<string>();
    const borderAnimations = new Map<string, { pause: () => void; resume: () => void }>();

    const notify = (id: string | null) => {
      if (!id) return;
      listeners.get(id)?.forEach(listener => listener());
    };

    return {
      focus: id => {
        if (activeId === id) return;
        const previous = activeId;
        activeId = id;
        notify(previous);
        notify(id);
      },
      isFocused: id => activeId === id,
      subscribe: (id, listener) => {
        const idListeners = listeners.get(id) ?? new Set<Listener>();
        idListeners.add(listener);
        listeners.set(id, idListeners);
        return () => {
          idListeners.delete(listener);
          if (idListeners.size === 0) listeners.delete(id);
        };
      },
      beginScroll: id => {
        if (scrollingIds.has(id)) return;
        const wasScrolling = scrollingIds.size > 0;
        scrollingIds.add(id);
        if (!wasScrolling) borderAnimations.forEach(animation => animation.pause());
      },
      endScroll: id => {
        if (!scrollingIds.delete(id)) return;
        if (scrollingIds.size === 0) borderAnimations.forEach(animation => animation.resume());
      },
      registerBorderAnimation: (id, pause, resume) => {
        borderAnimations.set(id, { pause, resume });
        if (scrollingIds.size > 0) pause();
        return () => borderAnimations.delete(id);
      },
    };
  }, []);

  return <Context.Provider value={store}>{children}</Context.Provider>;
};

/** Access stable imperative controls without subscribing the border to React renders. */
export const useLiquidBorderAnimationController = () => useContext(Context);

/** Register drag and momentum phases without rerendering the screen on scroll events. */
export const useLiquidBorderScrollHandlers = (): Pick<ScrollViewProps,
  'onScrollBeginDrag' | 'onScrollEndDrag' | 'onMomentumScrollBegin' | 'onMomentumScrollEnd'
> => {
  const store = useContext(Context);
  const idRef = useRef<string | null>(null);
  if (!idRef.current) idRef.current = createLiquidBorderFocusId('scroll');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelEnd = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);
  const begin = useCallback(() => {
    cancelEnd();
    store.beginScroll(idRef.current!);
  }, [cancelEnd, store]);
  const end = useCallback(() => {
    cancelEnd();
    store.endScroll(idRef.current!);
  }, [cancelEnd, store]);
  const onScrollEndDrag = useCallback((_event: NativeSyntheticEvent<NativeScrollEvent>) => {
    cancelEnd();
    timerRef.current = setTimeout(end, 140);
  }, [cancelEnd, end]);
  useEffect(() => () => {
    cancelEnd();
    store.endScroll(idRef.current!);
  }, [cancelEnd, store]);
  return useMemo(() => ({
    onScrollBeginDrag: begin,
    onScrollEndDrag,
    onMomentumScrollBegin: begin,
    onMomentumScrollEnd: end,
  }), [begin, end, onScrollEndDrag]);
};

/** Subscribe only this surface to its own focus state, avoiding app-wide rerenders. */
export const useLiquidBorderFocus = (id: string) => {
  const store = useContext(Context);
  const focused = useSyncExternalStore(
    listener => store.subscribe(id, listener),
    () => store.isFocused(id),
    () => false,
  );
  return useMemo(() => ({ focused, focus: store.focus }), [focused, store]);
};
