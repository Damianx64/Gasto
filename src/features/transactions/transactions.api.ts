import {
  createLocalTransaction,
  deleteLocalTransaction,
  getLocalTransactionEditorData,
  listLocalTransactions,
  updateLocalTransaction,
} from '@/features/offline/repository';

import type { TransactionInput } from './types';

export async function listTransactions(walletId: string | null = null) {
  return listLocalTransactions(walletId);
}

export async function getTransactionEditorData(transactionId: string) {
  return getLocalTransactionEditorData(transactionId);
}

export async function createTransaction(input: TransactionInput) {
  return createLocalTransaction(input);
}

export async function updateTransaction(transactionId: string, input: TransactionInput) {
  return updateLocalTransaction(transactionId, input);
}

export async function deleteTransaction(transactionId: string) {
  return deleteLocalTransaction(transactionId);
}
