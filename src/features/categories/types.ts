import type { TransactionType } from '@/features/transactions/types';

import type { CategoryIconKey } from './constants';

export type Category = {
  color: string | null;
  id: string;
  icon_key: string | null;
  name: string;
  type: TransactionType;
};

export type CategoryInput = {
  color: string;
  iconKey: CategoryIconKey;
  name: string;
  type: TransactionType;
};
