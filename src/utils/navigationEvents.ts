// src/utils/navigationEvents.ts
type NavListener = (screen: string) => void;
const listeners = new Set<NavListener>();

export function resolveStaffScreen(path: string) {
  const target = path.trim().replace(/^\//, '');
  const aliases: Record<string, string> = {
    'change-password': 'change_password', medicines: 'pharmacy_inventory',
    'lab/tests': 'lab_management', 'billing/treatment': 'treatment_billing',
  };
  return aliases[target] || target;
}

export function navigateStaffScreen(screen: string) {
  const target = resolveStaffScreen(screen);

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
