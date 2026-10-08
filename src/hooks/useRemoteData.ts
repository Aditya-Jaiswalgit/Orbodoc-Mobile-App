import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

// A resource belongs to its key (including session/clinic). Never display a
// previous clinic's result, and coalesce repeated refreshes while it is loading.
export function useRemoteData<T>(
  key: string,
  loader: (signal: AbortSignal) => Promise<T>,
  enabled = true,
) {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const currentKey = useRef(key);
  currentKey.current = key;
  const mounted = useRef(false);
  const sequence = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const pending = useRef<{ key: string; promise: Promise<void> } | null>(null);
  const [state, setState] = useState<{
    key: string;
    data: T | null;
    loading: boolean;
    error: string | null;
  }>({
    key,
    data: null,
    loading: enabled,
    error: null,
  });
  const refresh = useCallback((): Promise<void> => {
    if (!enabled || !mounted.current) return Promise.resolve();
    if (pending.current?.key === key) return pending.current.promise;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const request = ++sequence.current;
    setState(previous => ({
      key,
      data: previous.key === key ? previous.data : null,
      loading: true,
      error: null,
    }));
    const promise = (async () => {
      try {
        const data = await loaderRef.current(controller.signal);
        if (
          mounted.current &&
          currentKey.current === key &&
          request === sequence.current
        ) {
          setState({ key, data, loading: false, error: null });
        }
      } catch {
        if (
          mounted.current &&
          currentKey.current === key &&
          request === sequence.current
        ) {
          setState({
            key,
            data: null,
            loading: false,
            error: 'Unable to load data. Please retry.',
          });
        }
      } finally {
        if (request === sequence.current) pending.current = null;
      }
    })();
    pending.current = { key, promise };
    return promise;
  }, [key, enabled]);

  useEffect(() => {
    mounted.current = true;
    pending.current = null;
    if (enabled) void refresh();
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') void refresh();
    });
    return () => {
      controllerRef.current?.abort();
      mounted.current = false;
      sequence.current += 1;
      pending.current = null;
      subscription.remove();
    };
  }, [refresh, enabled]);

  const active = state.key === key && enabled;
  return {
    data: active ? state.data : null,
    loading: enabled && (!active || state.loading),
    error: active ? state.error : null,
    refresh,
  };
}
