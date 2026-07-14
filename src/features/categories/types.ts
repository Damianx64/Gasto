import type { TransactionType } from '@/features/transactions/types';

export type Category = {
  color: string | null;
  id: string;
  name: string;
  type: TransactionType;
};

export type CategoryInput = {
  color: string;
  name: string;
  type: TransactionType;
};
