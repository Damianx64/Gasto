import {
  createLocalTransaction,
  deleteLocalTransaction,
  getLocalTransactionEditorData,
  listLocalTransactions,
  updateLocalTransaction,
} from '@/features/offline/repository';

import type { TransactionInput, TransactionListItem } from './types';

const transactionListCache = new Map<string, TransactionListItem[]>();

function getTransactionCacheKey(walletId: string | null) {
  return walletId ?? 'all';
}

export function getCachedTransactions(walletId: string | null = null) {
  return transactionListCache.get(getTransactionCacheKey(walletId)) ?? null;
}

export async function listTransactions(walletId: string | null = null) {
  const transactions = await listLocalTransactions(walletId);
  transactionListCache.set(getTransactionCacheKey(walletId), transactions);
  return transactions;
}

export async function preloadTransactions(walletIds: (string | null)[]) {
  await Promise.all(
    [...new Set(walletIds)].map((walletId) => listTransactions(walletId)),
  );
}

export async function getTransactionEditorData(transactionId: string) {
  return getLocalTransactionEditorData(transactionId);
}

export async function createTransaction(input: TransactionInput) {
  const transactionId = await createLocalTransaction(input);
  transactionListCache.clear();
  return transactionId;
}

export async function updateTransaction(transactionId: string, input: TransactionInput) {
  await updateLocalTransaction(transactionId, input);
  transactionListCache.clear();
}

export async function deleteTransaction(transactionId: string) {
  await deleteLocalTransaction(transactionId);
  transactionListCache.clear();
}
