import * as Network from 'expo-network';

import { getCurrentSession } from '@/features/auth/auth.api';
import { supabase } from '@/lib/supabase';

import { getLocalUserState } from './database';
import { getPendingSyncChanges, mergeSyncSnapshot } from './repository';
import type {
  CategorySyncRecord,
  SubmittedSyncChange,
  SyncSnapshot,
  TransactionSyncRecord,
  WalletSyncRecord,
} from './types';
import { isCategoryType, isTransactionType, isWalletType } from './types';

const activeSynchronizations = new Map<string, Promise<void>>();

export class OfflineNetworkError extends Error {
  constructor() {
    super('Sin conexión a internet. Tus cambios permanecen guardados en este dispositivo.');
    this.name = 'OfflineNetworkError';
  }
}

export class SyncAuthenticationError extends Error {
  constructor() {
    super('Vuelve a iniciar sesión para sincronizar tus cambios.');
    this.name = 'SyncAuthenticationError';
  }
}

function isCategoryRecord(value: unknown): value is CategorySyncRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<CategorySyncRecord>;
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    isCategoryType(record.type) &&
    typeof record.created_at === 'string' &&
    Number.isFinite(Date.parse(record.created_at)) &&
    typeof record.client_updated_at === 'string' &&
    Number.isFinite(Date.parse(record.client_updated_at)) &&
    typeof record.last_change_id === 'string'
  );
}

function isTransactionRecord(value: unknown): value is TransactionSyncRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<TransactionSyncRecord>;
  return (
    typeof record.id === 'string' &&
    isTransactionType(record.type) &&
    (record.category_id === null || typeof record.category_id === 'string') &&
    (record.wallet_id === null || typeof record.wallet_id === 'string') &&
    (record.destination_wallet_id === null ||
      typeof record.destination_wallet_id === 'string') &&
    (typeof record.amount === 'number' || typeof record.amount === 'string') &&
    typeof record.transaction_date === 'string' &&
    typeof record.created_at === 'string' &&
    Number.isFinite(Date.parse(record.created_at)) &&
    typeof record.client_updated_at === 'string' &&
    Number.isFinite(Date.parse(record.client_updated_at)) &&
    typeof record.last_change_id === 'string'
  );
}

function isWalletRecord(value: unknown): value is WalletSyncRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<WalletSyncRecord>;
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    isWalletType(record.type) &&
    typeof record.created_at === 'string' &&
    Number.isFinite(Date.parse(record.created_at)) &&
    typeof record.client_updated_at === 'string' &&
    Number.isFinite(Date.parse(record.client_updated_at)) &&
    typeof record.last_change_id === 'string'
  );
}

function normalizeTimestamp(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new Error('Supabase devolvió una fecha de sincronización inválida.');
  }
  return new Date(timestamp).toISOString();
}

function normalizeNullableTimestamp(value: string | null) {
  return value ? normalizeTimestamp(value) : null;
}

function parseSnapshot(value: unknown): SyncSnapshot {
  if (!value || typeof value !== 'object') {
    throw new Error('Supabase devolvió una respuesta de sincronización inválida.');
  }

  const candidate = value as Partial<SyncSnapshot>;
  if (
    !Array.isArray(candidate.categories) ||
    !candidate.categories.every(isCategoryRecord) ||
    !Array.isArray(candidate.transactions) ||
    !candidate.transactions.every(isTransactionRecord) ||
    !Array.isArray(candidate.wallets) ||
    !candidate.wallets.every(isWalletRecord) ||
    typeof candidate.server_time !== 'string'
  ) {
    throw new Error('Supabase devolvió datos incompletos durante la sincronización.');
  }

  const categories = candidate.categories as CategorySyncRecord[];
  const transactions = candidate.transactions as TransactionSyncRecord[];
  const wallets = candidate.wallets as WalletSyncRecord[];

  return {
    categories: categories.map((category) => ({
      ...category,
      created_at: normalizeTimestamp(category.created_at),
      deleted_at: normalizeNullableTimestamp(category.deleted_at),
    })),
    server_time: normalizeTimestamp(candidate.server_time),
    transactions: transactions.map((transaction) => ({
      ...transaction,
      created_at: normalizeTimestamp(transaction.created_at),
      deleted_at: normalizeNullableTimestamp(transaction.deleted_at),
    })),
    wallets: wallets.map((wallet) => ({
      ...wallet,
      created_at: normalizeTimestamp(wallet.created_at),
      deleted_at: normalizeNullableTimestamp(wallet.deleted_at),
    })),
  };
}

function serializeChanges(changes: SubmittedSyncChange[]) {
  return changes.map(({ entity, record }) => ({ entity, record }));
}

async function assertNetworkAvailable() {
  const network = await Network.getNetworkStateAsync();
  if (network.isConnected === false || network.isInternetReachable === false) {
    throw new OfflineNetworkError();
  }
}

async function runSynchronization(userId: string) {
  await assertNetworkAvailable();

  const session = await getCurrentSession();
  if (!session || session.user.id !== userId) throw new SyncAuthenticationError();

  const submitted = await getPendingSyncChanges(userId);
  const { data, error } = await supabase.rpc('sync_finance_data', {
    p_changes: serializeChanges(submitted),
  });

  if (error) {
    if (error.code === 'PGRST301' || /jwt|auth|session/i.test(error.message)) {
      throw new SyncAuthenticationError();
    }
    if (error.code === '23505') {
      throw new Error(
        'Ya existe una billetera con ese nombre en otro dispositivo. Renombra la billetera pendiente para continuar la sincronización.',
      );
    }
    throw error;
  }

  await mergeSyncSnapshot(userId, parseSnapshot(data), submitted);
}

export async function synchronizeUser(userId: string) {
  const running = activeSynchronizations.get(userId);
  if (running) return running;

  const synchronization = runSynchronization(userId).finally(() => {
    activeSynchronizations.delete(userId);
  });
  activeSynchronizations.set(userId, synchronization);
  return synchronization;
}

export async function hasPendingLocalChanges(userId: string) {
  return (await getLocalUserState(userId)).pendingCount > 0;
}
