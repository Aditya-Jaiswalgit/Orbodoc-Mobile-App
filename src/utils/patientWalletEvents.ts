type WalletBalanceListener = (balance: number) => void;
const listeners = new Set<WalletBalanceListener>();

export function publishPatientWalletBalance(balance: number) {
  listeners.forEach(listener => listener(balance));
}

export function subscribePatientWalletBalance(listener: WalletBalanceListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
