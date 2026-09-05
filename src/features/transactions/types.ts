export type TransactionType = 'income' | 'expense' | 'transfer';

export type TransactionCategory = {
  color: string | null;
  icon_key: string | null;
  name: string;
};

export type TransactionWallet = {
  deleted_at: string | null;
  name: string;
  type: 'cash' | 'debit';
};

export type TransactionListItem = {
  amount: number | string;
  categories: TransactionCategory | TransactionCategory[] | null;
  description: string | null;
  destination_wallet_id: string | null;
  destination_wallet: TransactionWallet | null;
  id: string;
  source_wallet: TransactionWallet | null;
  transaction_date: string;
  type: TransactionType;
  wallet_id: string | null;
};

export type TransactionDetails = {
  amount: number | string;
  category_id: string | null;
  description: string | null;
  destination_wallet_id: string | null;
  transaction_date: string;
  type: TransactionType;
  wallet_id: string | null;
};

type TransactionInputBase = {
  amount: number;
  description: string;
  transactionDate: string;
};

export type StandardTransactionInput = TransactionInputBase & {
  categoryId: string;
  destinationWalletId?: never;
  type: 'income' | 'expense';
  walletId: string | null;
};

export type TransferTransactionInput = TransactionInputBase & {
  categoryId?: never;
  destinationWalletId: string;
  type: 'transfer';
  walletId: string;
};

export type TransactionInput = StandardTransactionInput | TransferTransactionInput;
