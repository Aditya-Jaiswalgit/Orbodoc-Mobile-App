const listeners = new Set<() => void>();

export function notifyProfileUpdated() {
  listeners.forEach(listener => listener());
}

export function subscribeProfileUpdated(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
