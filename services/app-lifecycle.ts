type RecoveryListener = () => void;

const recoveryListeners = new Set<RecoveryListener>();

export function subscribeToAppRecovery(listener: RecoveryListener) {
  recoveryListeners.add(listener);
  return () => recoveryListeners.delete(listener);
}

export function requestAppRecovery() {
  recoveryListeners.forEach((listener) => listener());
}
