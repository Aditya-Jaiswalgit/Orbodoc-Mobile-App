type PatientNavigationListener = (screen: string) => void;
const listeners = new Set<PatientNavigationListener>();

export function navigatePatientScreen(screen: string) {
  listeners.forEach(listener => listener(screen));
}

export function subscribePatientNavigation(listener: PatientNavigationListener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
