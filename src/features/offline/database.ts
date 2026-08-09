import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_NAME = 'gasto-offline.db';
const DATABASE_VERSION = 2;

let databasePromise: Promise<SQLiteDatabase> | null = null;

async function migrateDatabase(database: SQLiteDatabase) {
  await database.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const versionRow = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) return;

  await database.execAsync(`
    DROP TABLE IF EXISTS sync_outbox;
    DROP TABLE IF EXISTS local_transactions;
    DROP TABLE IF EXISTS local_categories;
    DROP TABLE IF EXISTS local_wallets;
    DROP TABLE IF EXISTS sync_meta;

    CREATE TABLE IF NOT EXISTS local_categories (
      user_id TEXT NOT NULL,
      id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      color TEXT,
      icon_key TEXT,
      created_at TEXT NOT NULL,
      client_updated_at TEXT NOT NULL,
      last_change_id TEXT NOT NULL,
      deleted_at TEXT,
      PRIMARY KEY (user_id, id)
    );

    CREATE TABLE IF NOT EXISTS local_wallets (
      user_id TEXT NOT NULL,
      id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('cash', 'debit')),
      created_at TEXT NOT NULL,
      client_updated_at TEXT NOT NULL,
      last_change_id TEXT NOT NULL,
      deleted_at TEXT,
      PRIMARY KEY (user_id, id)
    );

    CREATE TABLE IF NOT EXISTS local_transactions (
      user_id TEXT NOT NULL,
      id TEXT NOT NULL,
      category_id TEXT,
      wallet_id TEXT,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      amount REAL NOT NULL,
      description TEXT,
      transaction_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      client_updated_at TEXT NOT NULL,
      last_change_id TEXT NOT NULL,
      deleted_at TEXT,
      PRIMARY KEY (user_id, id)
    );

    CREATE TABLE IF NOT EXISTS sync_outbox (
      user_id TEXT NOT NULL,
      entity_type TEXT NOT NULL CHECK (entity_type IN ('category', 'transaction', 'wallet')),
      entity_id TEXT NOT NULL,
      change_id TEXT NOT NULL,
      queued_at TEXT NOT NULL,
      PRIMARY KEY (user_id, entity_type, entity_id)
    );

    CREATE TABLE IF NOT EXISTS sync_meta (
      user_id TEXT PRIMARY KEY NOT NULL,
      is_bootstrapped INTEGER NOT NULL DEFAULT 0,
      last_synced_at TEXT
    );

    CREATE INDEX IF NOT EXISTS local_categories_active_idx
      ON local_categories (user_id, deleted_at, type, name);
    CREATE INDEX IF NOT EXISTS local_wallets_active_idx
      ON local_wallets (user_id, deleted_at, created_at, id);
    CREATE UNIQUE INDEX IF NOT EXISTS local_wallets_active_name_idx
      ON local_wallets (user_id, lower(trim(name)))
      WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS local_transactions_active_idx
      ON local_transactions (user_id, deleted_at, transaction_date, created_at);
    CREATE INDEX IF NOT EXISTS local_transactions_category_idx
      ON local_transactions (user_id, category_id);
    CREATE INDEX IF NOT EXISTS local_transactions_wallet_idx
      ON local_transactions (user_id, wallet_id);
    CREATE INDEX IF NOT EXISTS sync_outbox_user_idx
      ON sync_outbox (user_id, queued_at);

    PRAGMA user_version = 2;
  `);
}

export async function getLocalDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME).then(async (database) => {
      await migrateDatabase(database);
      return database;
    });
  }

  return databasePromise;
}

export async function withLocalTransaction<T>(
  task: (transaction: SQLiteDatabase) => Promise<T>,
) {
  const database = await getLocalDatabase();
  let result: T | undefined;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    result = await task(transaction);
  });

  return result as T;
}

export async function getLocalUserState(userId: string) {
  const database = await getLocalDatabase();
  const [meta, pending] = await Promise.all([
    database.getFirstAsync<{ is_bootstrapped: number; last_synced_at: string | null }>(
      'SELECT is_bootstrapped, last_synced_at FROM sync_meta WHERE user_id = ?',
      userId,
    ),
    database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM sync_outbox WHERE user_id = ?',
      userId,
    ),
  ]);

  return {
    isBootstrapped: meta?.is_bootstrapped === 1,
    lastSyncedAt: meta?.last_synced_at ?? null,
    pendingCount: pending?.count ?? 0,
  };
}

export async function assertLocalUserIsBootstrapped(userId: string) {
  const state = await getLocalUserState(userId);

  if (!state.isBootstrapped) {
    throw new Error('Conéctate para preparar tus datos en este dispositivo.');
  }
}

export async function clearLocalUserData(userId: string) {
  await withLocalTransaction(async (database) => {
    await database.runAsync('DELETE FROM sync_outbox WHERE user_id = ?', userId);
    await database.runAsync('DELETE FROM local_transactions WHERE user_id = ?', userId);
    await database.runAsync('DELETE FROM local_categories WHERE user_id = ?', userId);
    await database.runAsync('DELETE FROM local_wallets WHERE user_id = ?', userId);
    await database.runAsync('DELETE FROM sync_meta WHERE user_id = ?', userId);
  });
  await clearLegacyOfflineCaches(userId);
}

export async function clearAllLocalData() {
  await withLocalTransaction(async (database) => {
    await database.runAsync('DELETE FROM sync_outbox');
    await database.runAsync('DELETE FROM local_transactions');
    await database.runAsync('DELETE FROM local_categories');
    await database.runAsync('DELETE FROM local_wallets');
    await database.runAsync('DELETE FROM sync_meta');
  });
}

export async function clearLegacyOfflineCaches(userId: string) {
  try {
    await AsyncStorage.multiRemove([
      `categories:${userId}`,
      `transactions:${userId}`,
      `wallet-selection:${userId}`,
    ]);
  } catch {
    // Las claves antiguas ya no se leen; su limpieza es de mejor esfuerzo.
  }
}
