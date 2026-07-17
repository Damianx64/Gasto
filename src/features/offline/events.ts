export type LocalDataChangeReason = 'mutation' | 'sync';

type LocalDataListener = (reason: LocalDataChangeReason) => void;

const listeners = new Set<LocalDataListener>();

export function emitLocalDataChanged(reason: LocalDataChangeReason = 'mutation') {
  for (const listener of listeners) listener(reason);
}

export function subscribeToLocalData(listener: LocalDataListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
