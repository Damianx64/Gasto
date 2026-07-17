import type { Category } from '@/features/categories/types';
import type {
  TransactionDetails,
  TransactionListItem,
  TransactionType,
} from '@/features/transactions/types';

export type SyncEntity = 'category' | 'transaction';

export type LocalCategory = Category & {
  client_updated_at: string;
  created_at: string;
  deleted_at: string | null;
  last_change_id: string;
  user_id: string;
};

export type LocalTransaction = TransactionDetails & {
  client_updated_at: string;
  created_at: string;
  deleted_at: string | null;
  id: string;
  last_change_id: string;
  user_id: string;
};

export type CategorySyncRecord = Omit<LocalCategory, 'user_id'>;

export type TransactionSyncRecord = Omit<LocalTransaction, 'user_id'>;

export type SyncChange =
  | { entity: 'category'; record: CategorySyncRecord }
  | { entity: 'transaction'; record: TransactionSyncRecord };

export type SubmittedSyncChange = SyncChange & {
  changeId: string;
  entityId: string;
};

export type SyncSnapshot = {
  categories: CategorySyncRecord[];
  server_time: string;
  transactions: TransactionSyncRecord[];
};

export type SyncStatus = 'bootstrapping' | 'error' | 'offline' | 'synced' | 'syncing';

export type SyncConnectivity = 'offline' | 'online' | 'unknown';

export type SyncState = {
  connectivity: SyncConnectivity;
  errorMessage: string;
  isBootstrapped: boolean;
  lastSyncedAt: string | null;
  pendingCount: number;
  requiresReauthentication: boolean;
  revision: number;
  status: SyncStatus;
};

export type LocalTransactionListItem = TransactionListItem & {
  created_at: string;
};

export function isTransactionType(value: unknown): value is TransactionType {
  return value === 'income' || value === 'expense';
}
