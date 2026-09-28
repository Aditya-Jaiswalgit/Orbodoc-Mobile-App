import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { useRemoteData } from '../src/hooks/useRemoteData';

let state: ReturnType<typeof useRemoteData<string>>;
let screen: Renderer.ReactTestRenderer;
function Harness({ resourceKey, loader }: { resourceKey: string; loader: (signal: AbortSignal) => Promise<string> }) {
  state = useRemoteData(resourceKey, loader);
  return null;
}
function deferred() {
  let resolve!: (value: string) => void;
  const promise = new Promise<string>(done => { resolve = done; });
  return { promise, resolve };
}
afterEach(async () => { await act(async () => screen?.unmount()); });

test('clinic switch aborts the old request and ignores its late response', async () => {
  const old = deferred();
  const next = deferred();
  const signals: AbortSignal[] = [];
  await act(async () => { screen = Renderer.create(<Harness resourceKey="clinic:1" loader={signal => { signals.push(signal); return old.promise; }} />); });
  await act(async () => { screen.update(<Harness resourceKey="clinic:2" loader={signal => { signals.push(signal); return next.promise; }} />); });
  expect(signals[0].aborted).toBe(true);
  expect(state.data).toBeNull();
  await act(async () => { next.resolve('Clinic two'); });
  await act(async () => { old.resolve('Clinic one'); });
  expect(state.data).toBe('Clinic two');
});

test('repeated refreshes share one request', async () => {
  const pending = deferred();
  const loader = jest.fn(() => pending.promise);
  await act(async () => { screen = Renderer.create(<Harness resourceKey="clinic:1" loader={loader} />); });
  let first!: Promise<void>, second!: Promise<void>;
  act(() => { first = state.refresh(); second = state.refresh(); });
  expect(first).toBe(second);
  expect(loader).toHaveBeenCalledTimes(1);
  await act(async () => { pending.resolve('Done'); await first; });
  expect(state.data).toBe('Done');
});

test('unmount cancels in-flight work', async () => {
  const pending = deferred();
  let signal!: AbortSignal;
  await act(async () => { screen = Renderer.create(<Harness resourceKey="clinic:1" loader={value => { signal = value; return pending.promise; }} />); });
  await act(async () => screen.unmount());
  expect(signal.aborted).toBe(true);
  await act(async () => pending.resolve('Late'));
});
