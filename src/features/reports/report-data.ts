import type {
  TransactionCategory,
  TransactionListItem,
} from '@/features/transactions/types';

export type CategoryExpense = {
  amount: number;
  color: string;
  icon_key: string | null;
  name: string;
  percentage: number;
};

export type MonthlyExpense = {
  amount: number;
  key: string;
  label: string;
};

export type ReportMonth = {
  key: string;
  label: string;
};

export type ReportsSummary = {
  categories: CategoryExpense[];
  currentMonthLabel: string;
  expenses: number;
  income: number;
  monthlyExpenses: MonthlyExpense[];
};

const fallbackCategoryColor = '#8B919B';

function getAmount(transaction: TransactionListItem) {
  const amount = Number(transaction.amount);
  return Number.isFinite(amount) ? amount : 0;
}

function getCategory(transaction: TransactionListItem): TransactionCategory | null {
  if (Array.isArray(transaction.categories)) {
    return transaction.categories[0] ?? null;
  }

  return transaction.categories;
}

export function getReportMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthDate(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);

  return new Date(year, month - 1, 1);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getMonthLabel(date: Date) {
  const label = new Intl.DateTimeFormat('es-MX', { month: 'short' })
    .format(date)
    .replace('.', '');

  return capitalize(label);
}

function getPeriodLabel(date: Date) {
  return capitalize(new Intl.DateTimeFormat('es-MX', {
    month: 'long',
    year: 'numeric',
  }).format(date));
}

export function getAvailableReportMonths(
  transactions: TransactionListItem[],
): ReportMonth[] {
  const monthKeys = new Set<string>();

  for (const transaction of transactions) {
    if (transaction.type === 'transfer') continue;

    const monthKey = transaction.transaction_date.slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(monthKey)) monthKeys.add(monthKey);
  }

  return [...monthKeys]
    .sort((left, right) => right.localeCompare(left))
    .map((key) => ({
      key,
      label: getPeriodLabel(getMonthDate(key)),
    }));
}

export function buildReportsSummary(
  transactions: TransactionListItem[],
  selectedMonth: Date | string = new Date(),
): ReportsSummary {
  const selectedMonthKey = typeof selectedMonth === 'string'
    ? selectedMonth
    : getReportMonthKey(selectedMonth);
  const selectedMonthDate = getMonthDate(selectedMonthKey);
  const monthDates = Array.from({ length: 6 }, (_, index) => {
    const monthsAgo = 5 - index;
    return new Date(
      selectedMonthDate.getFullYear(),
      selectedMonthDate.getMonth() - monthsAgo,
      1,
    );
  });
  const monthlyTotals = new Map(
    monthDates.map((date) => [getReportMonthKey(date), 0]),
  );
  const categoryTotals = new Map<string, Omit<CategoryExpense, 'percentage'>>();
  let expenses = 0;
  let income = 0;

  for (const transaction of transactions) {
    if (transaction.type === 'transfer') continue;

    const amount = getAmount(transaction);
    const transactionMonthKey = transaction.transaction_date.slice(0, 7);

    if (transaction.type === 'expense' && monthlyTotals.has(transactionMonthKey)) {
      monthlyTotals.set(
        transactionMonthKey,
        (monthlyTotals.get(transactionMonthKey) ?? 0) + amount,
      );
    }

    if (transactionMonthKey !== selectedMonthKey) continue;

    if (transaction.type === 'income') {
      income += amount;
      continue;
    }

    expenses += amount;
    const category = getCategory(transaction);
    const name = category?.name?.trim() || 'Sin categoría';
    const savedCategory = categoryTotals.get(name);

    categoryTotals.set(name, {
      amount: (savedCategory?.amount ?? 0) + amount,
      color: category?.color || savedCategory?.color || fallbackCategoryColor,
      icon_key: category?.icon_key || savedCategory?.icon_key || null,
      name,
    });
  }

  const categories = [...categoryTotals.values()]
    .sort((left, right) => right.amount - left.amount)
    .map((category) => ({
      ...category,
      percentage: expenses > 0 ? (category.amount / expenses) * 100 : 0,
    }));

  return {
    categories,
    currentMonthLabel: getPeriodLabel(selectedMonthDate),
    expenses,
    income,
    monthlyExpenses: monthDates.map((date) => {
      const key = getReportMonthKey(date);

      return {
        amount: monthlyTotals.get(key) ?? 0,
        key,
        label: getMonthLabel(date),
      };
    }),
  };
}
