import type { TransactionCategory, TransactionListItem } from './types';

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  currency: 'MXN',
  style: 'currency',
});

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function formatCurrency(amount: number | string) {
  return currencyFormatter.format(Number(amount));
}

export function formatTransactionDate(date: string) {
  return dateFormatter.format(new Date(`${date}T00:00:00`));
}

export function getTransactionCategory(
  transaction: TransactionListItem,
): TransactionCategory | null {
  if (Array.isArray(transaction.categories)) {
    return transaction.categories[0] ?? null;
  }

  return transaction.categories;
}

export function getTransactionCategoryName(transaction: TransactionListItem) {
  return getTransactionCategory(transaction)?.name ?? 'Sin categoría';
}

export function getTransactionAmount(transaction: TransactionListItem) {
  const amount = Number(transaction.amount);
  return Number.isFinite(amount) ? amount : 0;
}

export function getTransactionImpact(
  transaction: TransactionListItem,
  walletId: string | null,
) {
  const amount = getTransactionAmount(transaction);

  if (transaction.type === 'transfer') {
    if (!walletId) return 0;
    if (transaction.wallet_id === walletId) return -amount;
    if (transaction.destination_wallet_id === walletId) return amount;
    return 0;
  }

  return transaction.type === 'income' ? amount : -amount;
}

export function getTransactionWalletName(
  wallet: TransactionListItem['source_wallet'] | TransactionListItem['destination_wallet'],
) {
  if (!wallet || wallet.deleted_at) return 'Billetera eliminada';
  return wallet.name;
}

export function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
