export type TransactionType = 'income' | 'expense';

export type TransactionCategory = {
  color: string | null;
  icon_key: string | null;
  name: string;
};

export type TransactionListItem = {
  amount: number | string;
  categories: TransactionCategory | TransactionCategory[] | null;
  description: string | null;
  id: string;
  transaction_date: string;
  type: TransactionType;
  wallet_id: string | null;
};

export type TransactionDetails = {
  amount: number | string;
  category_id: string | null;
  description: string | null;
  transaction_date: string;
  type: TransactionType;
  wallet_id: string | null;
};

export type TransactionInput = {
  amount: number;
  categoryId: string;
  description: string;
  transactionDate: string;
  type: TransactionType;
  walletId: string | null;
};
