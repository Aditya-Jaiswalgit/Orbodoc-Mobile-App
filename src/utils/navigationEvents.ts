// src/utils/navigationEvents.ts
type NavListener = (screen: string) => void;
const listeners = new Set<NavListener>();

export function navigateStaffScreen(screen: string) {
  let target = screen.trim();
  if (target.startsWith('/')) target = target.slice(1);
  if (target === 'change-password') target = 'change_password';

  listeners.forEach((listener) => {
    try {
      listener(target);
    } catch (e) {
      console.error('Navigation listener error:', e);
    }
  });
}

export function subscribeStaffNavigation(listener: NavListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
