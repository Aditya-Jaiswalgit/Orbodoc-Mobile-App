// src/utils/navigationEvents.ts
type NavListener = (screen: string) => void;
const listeners = new Set<NavListener>();

export function resolveStaffScreen(path: string) {
  let target = path.trim();
  let search = '';
  try {
    const url = new URL(target, 'https://staff.local');
    target = url.pathname;
    search = url.search;
  } catch {
    const queryIndex = target.indexOf('?');
    if (queryIndex >= 0) {
      search = target.slice(queryIndex);
      target = target.slice(0, queryIndex);
    }
    target = target.split('#', 1)[0];
  }
  target = target.replace(/^\//, '').replace(/\/$/, '');
  const aliases: Record<string, string> = {
    'change-password': 'change_password', medicines: 'pharmacy_inventory',
    'lab/tests': 'lab_tests', 'billing/treatment': 'treatment_billing',
    'billing/medicine': 'medicine_billing',
  };
  return `${aliases[target] || target}${search}`;
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
