import {
  createLocalWallet,
  deleteLocalWallet,
  getLocalWallet,
  listLocalWallets,
  reorderLocalWallets,
  updateLocalWallet,
} from '@/features/offline/repository';

import type { WalletInput } from './types';

export async function listWallets() {
  return listLocalWallets();
}

export async function getWallet(walletId: string) {
  return getLocalWallet(walletId);
}

export async function createWallet(input: WalletInput) {
  return createLocalWallet(input);
}

export async function updateWallet(walletId: string, input: WalletInput) {
  return updateLocalWallet(walletId, input);
}

export async function deleteWallet(walletId: string) {
  return deleteLocalWallet(walletId);
}

export async function reorderWallets(orderedWalletIds: string[]) {
  return reorderLocalWallets(orderedWalletIds);
}
