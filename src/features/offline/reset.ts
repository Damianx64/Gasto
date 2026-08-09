import AsyncStorage from '@react-native-async-storage/async-storage';

import { resetLocalAuth } from '@/features/auth/auth.api';

import { clearAllLocalData } from './database';

const RESET_MARKER_KEY = 'app:data-reset:wallets-v1';

let activeReset: Promise<void> | null = null;

async function executeReset() {
  if ((await AsyncStorage.getItem(RESET_MARKER_KEY)) === 'complete') return;

  await resetLocalAuth();
  await clearAllLocalData();

  const keys = await AsyncStorage.getAllKeys();
  const legacyKeys = keys.filter(
    (key) =>
      key.startsWith('categories:') ||
      key.startsWith('transactions:') ||
      key.startsWith('wallet-selection:'),
  );
  if (legacyKeys.length > 0) await AsyncStorage.multiRemove(legacyKeys);

  await AsyncStorage.setItem(RESET_MARKER_KEY, 'complete');
}

export function runOneTimeDataReset() {
  if (!activeReset) {
    activeReset = executeReset().finally(() => {
      activeReset = null;
    });
  }
  return activeReset;
}
