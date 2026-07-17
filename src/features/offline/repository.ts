import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { requireOfflineUserId } from '@/features/auth/auth.api';
import type { Category, CategoryInput } from '@/features/categories/types';
import type {
  TransactionDetails,
  TransactionInput,
  TransactionListItem,
} from '@/features/transactions/types';

import {
  assertLocalUserIsBootstrapped,
  clearLegacyOfflineCaches,
  getLocalDatabase,
  withLocalTransaction,
} from './database';
import { emitLocalDataChanged } from './events';
import type {
  CategorySyncRecord,
  LocalCategory,
  LocalTransaction,
  SubmittedSyncChange,
  SyncEntity,
  SyncSnapshot,
  TransactionSyncRecord,
} from './types';

type CategoryRow = LocalCategory;
type TransactionRow = LocalTransaction;
type TransactionListRow = Omit<TransactionRow, 'deleted_at' | 'user_id'> & {
  category_color: string | null;
  category_icon_key: string | null;
  category_name: string | null;
};

function nextTimestamp(previous?: string | null) {
  const now = Date.now();
  const previousTime = previous ? Date.parse(previous) : Number.NaN;
  const timestamp = Number.isFinite(previousTime) && previousTime >= now ? previousTime + 1 : now;
  return new Date(timestamp).toISOString();
}

function compareVersions(
  left: { client_updated_at: string; last_change_id: string },
  right: { client_updated_at: string; last_change_id: string },
) {
  const toMicroseconds = (value: string) => {
    const milliseconds = Date.parse(value);
    const fractionalDigits = value.match(/\.(\d+)(?:Z|[+-]\d{2}:?\d{2})$/)?.[1] ?? '';
    const subMilliseconds = Number(fractionalDigits.padEnd(6, '0').slice(3, 6) || 0);
    return milliseconds * 1_000 + subMilliseconds;
  };
  const timestampComparison =
    toMicroseconds(left.client_updated_at) - toMicroseconds(right.client_updated_at);
  if (timestampComparison) return timestampComparison;
  if (left.last_change_id === right.last_change_id) return 0;
  return left.last_change_id < right.last_change_id ? -1 : 1;
}

async function enqueueChange(
  database: SQLiteDatabase,
  userId: string,
  entity: SyncEntity,
  entityId: string,
  changeId: string,
  queuedAt: string,
) {
  await database.runAsync(
    `INSERT INTO sync_outbox (user_id, entity_type, entity_id, change_id, queued_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (user_id, entity_type, entity_id) DO UPDATE SET
       change_id = excluded.change_id,
       queued_at = excluded.queued_at`,
    userId,
    entity,
    entityId,
    changeId,
    queuedAt,
  );
}

async function getReadyUserId() {
  const userId = await requireOfflineUserId();
  await assertLocalUserIsBootstrapped(userId);
  return userId;
}

export async function listLocalCategories() {
  const userId = await getReadyUserId();
  const database = await getLocalDatabase();
  const rows = await database.getAllAsync<CategoryRow>(
    `SELECT user_id, id, name, type, color, icon_key, created_at,
            client_updated_at, last_change_id, deleted_at
       FROM local_categories
      WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY type ASC, name COLLATE NOCASE ASC`,
    userId,
  );

  return rows.map<Category>(({ color, icon_key, id, name, type }) => ({
    color,
    icon_key,
    id,
    name,
    type,
  }));
}

export async function getLocalCategory(categoryId: string) {
  const categories = await listLocalCategories();
  const category = categories.find((currentCategory) => currentCategory.id === categoryId);

  if (!category) throw new Error('No se encontró la categoría.');
  return category;
}

export async function createLocalCategory(input: CategoryInput) {
  const userId = await getReadyUserId();
  const id = Crypto.randomUUID();
  const changeId = Crypto.randomUUID();
  const changedAt = nextTimestamp();

  await withLocalTransaction(async (database) => {
    await database.runAsync(
      `INSERT INTO local_categories (
        user_id, id, name, type, color, icon_key, created_at,
        client_updated_at, last_change_id, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      userId,
      id,
      input.name,
      input.type,
      input.color,
      input.iconKey,
      changedAt,
      changedAt,
      changeId,
    );
    await enqueueChange(database, userId, 'category', id, changeId, changedAt);
  });

  emitLocalDataChanged();
  return id;
}

export async function updateLocalCategory(categoryId: string, input: CategoryInput) {
  const userId = await getReadyUserId();

  await withLocalTransaction(async (database) => {
    const current = await database.getFirstAsync<CategoryRow>(
      `SELECT * FROM local_categories
        WHERE user_id = ? AND id = ? AND deleted_at IS NULL`,
      userId,
      categoryId,
    );

    if (!current) throw new Error('No se encontró la categoría.');

    const changeId = Crypto.randomUUID();
    const changedAt = nextTimestamp(current.client_updated_at);
    await database.runAsync(
      `UPDATE local_categories
          SET name = ?, type = ?, color = ?, icon_key = ?, client_updated_at = ?,
              last_change_id = ?, deleted_at = NULL
        WHERE user_id = ? AND id = ?`,
      input.name,
      input.type,
      input.color,
      input.iconKey,
      changedAt,
      changeId,
      userId,
      categoryId,
    );
    await enqueueChange(database, userId, 'category', categoryId, changeId, changedAt);
  });

  emitLocalDataChanged();
}

export async function deleteLocalCategory(categoryId: string) {
  const userId = await getReadyUserId();

  await withLocalTransaction(async (database) => {
    const current = await database.getFirstAsync<CategoryRow>(
      `SELECT * FROM local_categories
        WHERE user_id = ? AND id = ? AND deleted_at IS NULL`,
      userId,
      categoryId,
    );

    if (!current) throw new Error('No se encontró la categoría.');

    const changeId = Crypto.randomUUID();
    const changedAt = nextTimestamp(current.client_updated_at);
    await database.runAsync(
      `UPDATE local_categories
          SET client_updated_at = ?, last_change_id = ?, deleted_at = ?
        WHERE user_id = ? AND id = ?`,
      changedAt,
      changeId,
      changedAt,
      userId,
      categoryId,
    );
    await database.runAsync(
      `UPDATE local_transactions
          SET category_id = NULL
        WHERE user_id = ? AND category_id = ?`,
      userId,
      categoryId,
    );
    await enqueueChange(database, userId, 'category', categoryId, changeId, changedAt);
  });

  emitLocalDataChanged();
}

export async function listLocalTransactions() {
  const userId = await getReadyUserId();
  const database = await getLocalDatabase();
  const rows = await database.getAllAsync<TransactionListRow>(
    `SELECT t.id, t.category_id, t.type, t.amount, t.description, t.transaction_date,
            t.created_at, t.client_updated_at, t.last_change_id,
            c.name AS category_name, c.color AS category_color,
            c.icon_key AS category_icon_key
       FROM local_transactions t
       LEFT JOIN local_categories c
         ON c.user_id = t.user_id AND c.id = t.category_id AND c.deleted_at IS NULL
      WHERE t.user_id = ? AND t.deleted_at IS NULL
      ORDER BY t.transaction_date DESC, t.created_at DESC`,
    userId,
  );

  return rows.map<TransactionListItem>((row) => ({
    amount: row.amount,
    categories: row.category_name
      ? {
          color: row.category_color,
          icon_key: row.category_icon_key,
          name: row.category_name,
        }
      : null,
    description: row.description,
    id: row.id,
    transaction_date: row.transaction_date,
    type: row.type,
  }));
}

export async function getLocalTransactionEditorData(transactionId: string) {
  const userId = await getReadyUserId();
  const database = await getLocalDatabase();
  const [categories, transaction] = await Promise.all([
    listLocalCategories(),
    database.getFirstAsync<TransactionRow>(
      `SELECT * FROM local_transactions
        WHERE user_id = ? AND id = ? AND deleted_at IS NULL`,
      userId,
      transactionId,
    ),
  ]);

  if (!transaction) throw new Error('No se encontró el movimiento.');

  const details: TransactionDetails = {
    amount: transaction.amount,
    category_id: transaction.category_id,
    description: transaction.description,
    transaction_date: transaction.transaction_date,
    type: transaction.type,
  };

  return { categories, transaction: details };
}

async function normalizeCategoryId(
  database: SQLiteDatabase,
  userId: string,
  categoryId: string,
  type: TransactionInput['type'],
) {
  if (!categoryId) return null;

  const category = await database.getFirstAsync<{ id: string }>(
    `SELECT id FROM local_categories
      WHERE user_id = ? AND id = ? AND type = ? AND deleted_at IS NULL`,
    userId,
    categoryId,
    type,
  );
  return category?.id ?? null;
}

export async function createLocalTransaction(input: TransactionInput) {
  const userId = await getReadyUserId();
  const id = Crypto.randomUUID();
  const changeId = Crypto.randomUUID();
  const changedAt = nextTimestamp();

  await withLocalTransaction(async (database) => {
    const categoryId = await normalizeCategoryId(database, userId, input.categoryId, input.type);
    await database.runAsync(
      `INSERT INTO local_transactions (
        user_id, id, category_id, type, amount, description, transaction_date,
        created_at, client_updated_at, last_change_id, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      userId,
      id,
      categoryId,
      input.type,
      input.amount,
      input.description || null,
      input.transactionDate,
      changedAt,
      changedAt,
      changeId,
    );
    await enqueueChange(database, userId, 'transaction', id, changeId, changedAt);
  });

  emitLocalDataChanged();
  return id;
}

export async function updateLocalTransaction(transactionId: string, input: TransactionInput) {
  const userId = await getReadyUserId();

  await withLocalTransaction(async (database) => {
    const current = await database.getFirstAsync<TransactionRow>(
      `SELECT * FROM local_transactions
        WHERE user_id = ? AND id = ? AND deleted_at IS NULL`,
      userId,
      transactionId,
    );

    if (!current) throw new Error('No se encontró el movimiento.');

    const categoryId = await normalizeCategoryId(database, userId, input.categoryId, input.type);
    const changeId = Crypto.randomUUID();
    const changedAt = nextTimestamp(current.client_updated_at);
    await database.runAsync(
      `UPDATE local_transactions
          SET category_id = ?, type = ?, amount = ?, description = ?, transaction_date = ?,
              client_updated_at = ?, last_change_id = ?, deleted_at = NULL
        WHERE user_id = ? AND id = ?`,
      categoryId,
      input.type,
      input.amount,
      input.description || null,
      input.transactionDate,
      changedAt,
      changeId,
      userId,
      transactionId,
    );
    await enqueueChange(database, userId, 'transaction', transactionId, changeId, changedAt);
  });

  emitLocalDataChanged();
}

export async function deleteLocalTransaction(transactionId: string) {
  const userId = await getReadyUserId();

  await withLocalTransaction(async (database) => {
    const current = await database.getFirstAsync<TransactionRow>(
      `SELECT * FROM local_transactions
        WHERE user_id = ? AND id = ? AND deleted_at IS NULL`,
      userId,
      transactionId,
    );

    if (!current) throw new Error('No se encontró el movimiento.');

    const changeId = Crypto.randomUUID();
    const changedAt = nextTimestamp(current.client_updated_at);
    await database.runAsync(
      `UPDATE local_transactions
          SET client_updated_at = ?, last_change_id = ?, deleted_at = ?
        WHERE user_id = ? AND id = ?`,
      changedAt,
      changeId,
      changedAt,
      userId,
      transactionId,
    );
    await enqueueChange(database, userId, 'transaction', transactionId, changeId, changedAt);
  });

  emitLocalDataChanged();
}

function toCategorySyncRecord(row: CategoryRow): CategorySyncRecord {
  return {
    client_updated_at: row.client_updated_at,
    color: row.color,
    created_at: row.created_at,
    deleted_at: row.deleted_at,
    icon_key: row.icon_key,
    id: row.id,
    last_change_id: row.last_change_id,
    name: row.name,
    type: row.type,
  };
}

function toTransactionSyncRecord(row: TransactionRow): TransactionSyncRecord {
  return {
    amount: row.amount,
    category_id: row.category_id,
    client_updated_at: row.client_updated_at,
    created_at: row.created_at,
    deleted_at: row.deleted_at,
    description: row.description,
    id: row.id,
    last_change_id: row.last_change_id,
    transaction_date: row.transaction_date,
    type: row.type,
  };
}

export async function getPendingSyncChanges(userId: string) {
  const database = await getLocalDatabase();
  const outbox = await database.getAllAsync<{
    change_id: string;
    entity_id: string;
    entity_type: SyncEntity;
  }>(
    `SELECT entity_type, entity_id, change_id
       FROM sync_outbox
      WHERE user_id = ?
      ORDER BY queued_at ASC`,
    userId,
  );
  const changes: SubmittedSyncChange[] = [];

  for (const queued of outbox) {
    if (queued.entity_type === 'category') {
      const row = await database.getFirstAsync<CategoryRow>(
        'SELECT * FROM local_categories WHERE user_id = ? AND id = ?',
        userId,
        queued.entity_id,
      );
      if (row) {
        changes.push({
          changeId: queued.change_id,
          entity: 'category',
          entityId: queued.entity_id,
          record: toCategorySyncRecord(row),
        });
      }
    } else {
      const row = await database.getFirstAsync<TransactionRow>(
        'SELECT * FROM local_transactions WHERE user_id = ? AND id = ?',
        userId,
        queued.entity_id,
      );
      if (row) {
        changes.push({
          changeId: queued.change_id,
          entity: 'transaction',
          entityId: queued.entity_id,
          record: toTransactionSyncRecord(row),
        });
      }
    }
  }

  return changes;
}

async function upsertRemoteCategory(
  database: SQLiteDatabase,
  userId: string,
  remote: CategorySyncRecord,
) {
  const local = await database.getFirstAsync<CategoryRow>(
    'SELECT * FROM local_categories WHERE user_id = ? AND id = ?',
    userId,
    remote.id,
  );

  if (local && compareVersions(remote, local) < 0) return;

  await database.runAsync(
    `INSERT INTO local_categories (
       user_id, id, name, type, color, icon_key, created_at,
       client_updated_at, last_change_id, deleted_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, id) DO UPDATE SET
       name = excluded.name,
       type = excluded.type,
       color = excluded.color,
       icon_key = excluded.icon_key,
       created_at = excluded.created_at,
       client_updated_at = excluded.client_updated_at,
       last_change_id = excluded.last_change_id,
       deleted_at = excluded.deleted_at`,
    userId,
    remote.id,
    remote.name,
    remote.type,
    remote.color,
    remote.icon_key,
    remote.created_at,
    remote.client_updated_at,
    remote.last_change_id,
    remote.deleted_at,
  );
}

async function upsertRemoteTransaction(
  database: SQLiteDatabase,
  userId: string,
  remote: TransactionSyncRecord,
) {
  const local = await database.getFirstAsync<TransactionRow>(
    'SELECT * FROM local_transactions WHERE user_id = ? AND id = ?',
    userId,
    remote.id,
  );

  if (local && compareVersions(remote, local) < 0) return;

  await database.runAsync(
    `INSERT INTO local_transactions (
       user_id, id, category_id, type, amount, description, transaction_date,
       created_at, client_updated_at, last_change_id, deleted_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, id) DO UPDATE SET
       category_id = excluded.category_id,
       type = excluded.type,
       amount = excluded.amount,
       description = excluded.description,
       transaction_date = excluded.transaction_date,
       created_at = excluded.created_at,
       client_updated_at = excluded.client_updated_at,
       last_change_id = excluded.last_change_id,
       deleted_at = excluded.deleted_at`,
    userId,
    remote.id,
    remote.category_id,
    remote.type,
    Number(remote.amount),
    remote.description,
    remote.transaction_date,
    remote.created_at,
    remote.client_updated_at,
    remote.last_change_id,
    remote.deleted_at,
  );
}

async function removeMissingCanonicalRows(
  database: SQLiteDatabase,
  userId: string,
  entity: SyncEntity,
  serverIds: Set<string>,
) {
  const table = entity === 'category' ? 'local_categories' : 'local_transactions';
  const rows = await database.getAllAsync<{ id: string }>(
    `SELECT item.id
       FROM ${table} AS item
       LEFT JOIN sync_outbox pending
         ON pending.user_id = item.user_id
        AND pending.entity_type = ?
        AND pending.entity_id = item.id
      WHERE item.user_id = ? AND pending.entity_id IS NULL`,
    entity,
    userId,
  );

  for (const row of rows) {
    if (!serverIds.has(row.id)) {
      await database.runAsync(`DELETE FROM ${table} WHERE user_id = ? AND id = ?`, userId, row.id);
    }
  }
}

export async function mergeSyncSnapshot(
  userId: string,
  snapshot: SyncSnapshot,
  submitted: SubmittedSyncChange[],
) {
  await withLocalTransaction(async (database) => {
    for (const category of snapshot.categories) {
      await upsertRemoteCategory(database, userId, category);
    }
    for (const transaction of snapshot.transactions) {
      await upsertRemoteTransaction(database, userId, transaction);
    }

    const categoryIds = new Set(snapshot.categories.map((category) => category.id));
    const transactionIds = new Set(snapshot.transactions.map((transaction) => transaction.id));
    await removeMissingCanonicalRows(database, userId, 'category', categoryIds);
    await removeMissingCanonicalRows(database, userId, 'transaction', transactionIds);

    const remoteVersions = new Map<string, CategorySyncRecord | TransactionSyncRecord>();
    for (const category of snapshot.categories) {
      remoteVersions.set(`category:${category.id}`, category);
    }
    for (const transaction of snapshot.transactions) {
      remoteVersions.set(`transaction:${transaction.id}`, transaction);
    }
    for (const change of submitted) {
      const remote = remoteVersions.get(`${change.entity}:${change.entityId}`);
      if (!remote || compareVersions(remote, change.record) < 0) continue;

      await database.runAsync(
        `DELETE FROM sync_outbox
          WHERE user_id = ? AND entity_type = ? AND entity_id = ? AND change_id = ?`,
        userId,
        change.entity,
        change.entityId,
        change.changeId,
      );
    }

    await database.runAsync(
      `INSERT INTO sync_meta (user_id, is_bootstrapped, last_synced_at)
       VALUES (?, 1, ?)
       ON CONFLICT (user_id) DO UPDATE SET
         is_bootstrapped = 1,
         last_synced_at = excluded.last_synced_at`,
      userId,
      snapshot.server_time,
    );
  });

  await clearLegacyOfflineCaches(userId);
  emitLocalDataChanged('sync');
}
