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

export function getToday() {
  return new Date().toISOString().slice(0, 10);
}
