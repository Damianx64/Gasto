import { useCallback, useMemo, useRef, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { router, type Href, useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/features/auth/use-auth-session';
import { CategoryIcon } from '@/features/categories/components/category-icon';
import {
  formatCurrency,
  formatTransactionDate,
  getTransactionCategory,
  getTransactionCategoryName,
} from '@/features/transactions/formatters';
import { listTransactions } from '@/features/transactions/transactions.api';
import type { TransactionListItem } from '@/features/transactions/types';
import { useTheme } from '@/hooks/use-theme';
import { getErrorMessage } from '@/lib/errors';

type CategorySummary = {
  amount: number;
  color: string;
  icon_key: string | null;
  name: string;
  percentage: number;
};

type MonthSummary = {
  expenses: number;
  income: number;
};

type Trend = {
  direction: 'down' | 'flat' | 'up';
  percentage: number;
};

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getTransactionAmount(transaction: TransactionListItem) {
  const amount = Number(transaction.amount);
  return Number.isFinite(amount) ? amount : 0;
}

function summarizeMonth(transactions: TransactionListItem[], monthKey: string): MonthSummary {
  return transactions.reduce<MonthSummary>(
    (summary, transaction) => {
      if (!transaction.transaction_date.startsWith(monthKey)) return summary;

      const amount = getTransactionAmount(transaction);

      if (transaction.type === 'income') {
        summary.income += amount;
      } else {
        summary.expenses += amount;
      }

      return summary;
    },
    { expenses: 0, income: 0 },
  );
}

function getTrend(current: number, previous: number): Trend | null {
  if (previous <= 0) return null;

  const difference = ((current - previous) / previous) * 100;

  return {
    direction: difference > 0 ? 'up' : difference < 0 ? 'down' : 'flat',
    percentage: Math.abs(difference),
  };
}

function getUserName(email?: string, metadataName?: unknown) {
  if (typeof metadataName === 'string' && metadataName.trim()) {
    return metadataName.trim();
  }

  const emailName = email?.split('@')[0]?.replace(/[._-]+/g, ' ').trim();
  if (!emailName) return 'de nuevo';

  return emailName.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function TrendLabel({ inverted, trend }: { inverted?: boolean; trend: Trend | null }) {
  if (!trend) {
    return (
      <ThemedText type="small" themeColor="textSecondary" style={styles.trendText}>
        — Sin comparativa
      </ThemedText>
    );
  }

  const isPositive =
    trend.direction === 'flat' || (trend.direction === 'up') !== Boolean(inverted);
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '—';

  return (
    <ThemedText
      type="smallBold"
      style={[styles.trendText, { color: isPositive ? '#16835C' : '#C24B52' }]}>
      {arrow} {trend.percentage.toFixed(1)}%
    </ThemedText>
  );
}

export default function DashboardScreen() {
  const theme = useTheme();
  const { session } = useAuthSession();
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const hasLoadedRef = useRef(false);

  const userName = getUserName(
    session?.user.email,
    session?.user.user_metadata?.user_name,
  );

  const loadDashboard = useCallback(async (mode: 'initial' | 'refresh' | 'silent') => {
    setErrorMessage('');

    if (mode === 'initial') setIsLoading(true);
    if (mode === 'refresh') setIsRefreshing(true);

    try {
      setTransactions(await listTransactions({ forceRefresh: mode === 'refresh' }));
      hasLoadedRef.current = true;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard(hasLoadedRef.current ? 'silent' : 'initial');
    }, [loadDashboard]),
  );

  const dashboard = useMemo(() => {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentSummary = summarizeMonth(transactions, getMonthKey(now));
    const previousSummary = summarizeMonth(transactions, getMonthKey(previousMonth));
    const categoryMap = new Map<string, Omit<CategorySummary, 'percentage'>>();

    let balance = 0;

    for (const transaction of transactions) {
      const amount = getTransactionAmount(transaction);
      balance += transaction.type === 'income' ? amount : -amount;

      if (
        transaction.type !== 'expense' ||
        !transaction.transaction_date.startsWith(getMonthKey(now))
      ) {
        continue;
      }

      const category = getTransactionCategory(transaction);
      const name = category?.name ?? 'Sin categoría';
      const savedCategory = categoryMap.get(name);

      categoryMap.set(name, {
        amount: (savedCategory?.amount ?? 0) + amount,
        color: category?.color || savedCategory?.color || '#8B919B',
        icon_key: category?.icon_key || savedCategory?.icon_key || null,
        name,
      });
    }

    const categories = [...categoryMap.values()]
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 4)
      .map((category) => ({
        ...category,
        percentage:
          currentSummary.expenses > 0 ? (category.amount / currentSummary.expenses) * 100 : 0,
      }));

    return {
      balance,
      categories,
      currentSummary,
      expenseTrend: getTrend(currentSummary.expenses, previousSummary.expenses),
      incomeTrend: getTrend(currentSummary.income, previousSummary.income),
      recentTransactions: transactions.slice(0, 6),
    };
  }, [transactions]);

  const cardColors = {
    backgroundColor: theme.background,
    borderColor: theme.backgroundSelected,
  };

  function openTransaction(transactionId: string) {
    router.push({ pathname: '/transaction/[id]', params: { id: transactionId } } as Href);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              onRefresh={() => loadDashboard('refresh')}
              refreshing={isRefreshing}
              tintColor={theme.text}
            />
          }
          showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={[styles.avatar, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold" style={styles.avatarText}>
                  {getInitials(userName)}
                </ThemedText>
              </View>

              <View style={styles.greeting}>
                <ThemedText style={styles.greetingTitle} numberOfLines={1}>
                  Hola, {userName}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Ahorro presente, futuro sonriente
                </ThemedText>
              </View>

              <Pressable
                accessibilityHint="Esta opción estará disponible próximamente"
                accessibilityLabel="Notificaciones"
                accessibilityRole="button"
                accessibilityState={{ disabled: true }}
                disabled
                style={[styles.iconButton, cardColors]}>
                <SymbolView
                  name={{ android: 'notifications', ios: 'bell', web: 'notifications' }}
                  size={23}
                  tintColor={theme.text}
                />
              </Pressable>
            </View>

            {isLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator color={theme.text} />
                <ThemedText type="small" themeColor="textSecondary">
                  Preparando tu resumen...
                </ThemedText>
              </View>
            ) : errorMessage ? (
              <View style={[styles.stateCard, cardColors]}>
                <ThemedText type="smallBold" style={styles.errorText}>
                  No pudimos cargar tu resumen
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.stateText}>
                  {errorMessage}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => loadDashboard('initial')}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.buttonPressed,
                  ]}>
                  <ThemedText type="smallBold" style={styles.primaryButtonText}>
                    Reintentar
                  </ThemedText>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={[styles.balanceCard, cardColors]}>
                  <View style={styles.balanceHeader}>
                    <ThemedText type="smallBold" style={styles.sectionEyebrow}>
                      Balance total
                    </ThemedText>
                    <Pressable
                      accessibilityLabel={
                        isBalanceVisible ? 'Ocultar balance' : 'Mostrar balance'
                      }
                      accessibilityRole="button"
                      hitSlop={10}
                      onPress={() => setIsBalanceVisible((visible) => !visible)}
                      style={({ pressed }) => pressed && styles.buttonPressed}>
                      <SymbolView
                        name={{
                          android: isBalanceVisible ? 'visibility' : 'visibility_off',
                          ios: isBalanceVisible ? 'eye' : 'eye.slash',
                          web: isBalanceVisible ? 'visibility' : 'visibility_off',
                        }}
                        size={21}
                        tintColor={theme.textSecondary}
                      />
                    </Pressable>
                  </View>

                  <ThemedText style={styles.balanceAmount} numberOfLines={1} adjustsFontSizeToFit>
                    {isBalanceVisible ? formatCurrency(dashboard.balance) : '••••••'}
                  </ThemedText>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push('/transactions')}
                    style={({ pressed }) => [
                      styles.outlineButton,
                      { borderColor: theme.backgroundSelected },
                      pressed && styles.buttonPressed,
                    ]}>
                    <ThemedText type="smallBold">Ver detalle</ThemedText>
                    <SymbolView
                      name={{ android: 'chevron_right', ios: 'chevron.right', web: 'chevron_right' }}
                      size={17}
                      tintColor={theme.text}
                    />
                  </Pressable>
                </View>

                <View style={styles.summaryRow}>
                  <View style={[styles.summaryCard, cardColors]}>
                    <ThemedText type="smallBold">Ingresos</ThemedText>
                    <ThemedText style={styles.summaryAmount} numberOfLines={1} adjustsFontSizeToFit>
                      {formatCurrency(dashboard.currentSummary.income)}
                    </ThemedText>
                    <View style={styles.summaryFooter}>
                      <ThemedText type="small" themeColor="textSecondary">
                        Este mes
                      </ThemedText>
                      <TrendLabel trend={dashboard.incomeTrend} />
                    </View>
                  </View>

                  <View style={[styles.summaryCard, cardColors]}>
                    <ThemedText type="smallBold">Gastos</ThemedText>
                    <ThemedText style={styles.summaryAmount} numberOfLines={1} adjustsFontSizeToFit>
                      {formatCurrency(dashboard.currentSummary.expenses)}
                    </ThemedText>
                    <View style={styles.summaryFooter}>
                      <ThemedText type="small" themeColor="textSecondary">
                        Este mes
                      </ThemedText>
                      <TrendLabel inverted trend={dashboard.expenseTrend} />
                    </View>
                  </View>
                </View>

                <View style={[styles.sectionCard, cardColors]}>
                  <View style={styles.sectionHeader}>
                    <ThemedText style={styles.sectionTitle}>Gastos por categoría</ThemedText>
                    <Pressable
                      accessibilityHint="Esta opción estará disponible próximamente"
                      accessibilityRole="button"
                      accessibilityState={{ disabled: true }}
                      disabled>
                      <ThemedText type="small" themeColor="textSecondary">
                        Ver todas
                      </ThemedText>
                    </Pressable>
                  </View>

                  {dashboard.categories.length ? (
                    <View style={styles.categoriesRow}>
                      {dashboard.categories.map((category, index) => (
                        <View
                          key={category.name}
                          style={[
                            styles.categoryItem,
                            index > 0 && {
                              borderLeftColor: theme.backgroundSelected,
                              borderLeftWidth: StyleSheet.hairlineWidth,
                            },
                          ]}>
                          <View style={styles.categoryNameRow}>
                            <CategoryIcon
                              color={category.color}
                              iconKey={category.icon_key}
                              size={24}
                              symbolSize={14}
                            />
                            <ThemedText
                              type="smallBold"
                              numberOfLines={1}
                              style={styles.categoryName}>
                              {category.name}
                            </ThemedText>
                          </View>
                          <ThemedText type="small" numberOfLines={1} style={styles.categoryAmount}>
                            {formatCurrency(category.amount)}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {category.percentage.toFixed(0)}%
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                      Aún no hay gastos registrados este mes.
                    </ThemedText>
                  )}
                </View>

                <View style={[styles.sectionCard, cardColors]}>
                  <View style={styles.sectionHeader}>
                    <ThemedText style={styles.sectionTitle}>Movimientos recientes</ThemedText>
                    <Pressable
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => router.push('/transactions')}
                      style={({ pressed }) => pressed && styles.buttonPressed}>
                      <ThemedText type="small">Ver todos</ThemedText>
                    </Pressable>
                  </View>

                  {dashboard.recentTransactions.length ? (
                    <View>
                      {dashboard.recentTransactions.map((transaction, index) => {
                        const isIncome = transaction.type === 'income';
                        const category = getTransactionCategory(transaction);

                        return (
                          <Pressable
                            accessibilityHint="Abre el detalle de este movimiento"
                            accessibilityRole="button"
                            key={transaction.id}
                            onPress={() => openTransaction(transaction.id)}
                            style={({ pressed }) => [
                              styles.transactionRow,
                              index > 0 && {
                                borderTopColor: theme.backgroundSelected,
                                borderTopWidth: StyleSheet.hairlineWidth,
                              },
                              pressed && styles.transactionPressed,
                            ]}>
                            <CategoryIcon
                              color={category?.color}
                              iconKey={category?.icon_key}
                              size={34}
                              symbolSize={19}
                            />
                            <View style={styles.transactionMain}>
                              <ThemedText type="smallBold" numberOfLines={1}>
                                {transaction.description || getTransactionCategoryName(transaction)}
                              </ThemedText>
                              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                                {getTransactionCategoryName(transaction)} ·{' '}
                                {formatTransactionDate(transaction.transaction_date)}
                              </ThemedText>
                            </View>

                            <ThemedText
                              type="smallBold"
                              style={[
                                styles.transactionAmount,
                                { color: isIncome ? '#16835C' : theme.text },
                              ]}>
                              {isIncome ? '+' : '-'}
                              {formatCurrency(transaction.amount)}
                            </ThemedText>

                            <SymbolView
                              name={{
                                android: 'chevron_right',
                                ios: 'chevron.right',
                                web: 'chevron_right',
                              }}
                              size={18}
                              tintColor={theme.textSecondary}
                            />
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.emptyMovements}>
                      <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                        Tus movimientos aparecerán aquí cuando registres el primero.
                      </ThemedText>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => router.push('/transaction/new')}
                        style={({ pressed }) => [
                          styles.primaryButton,
                          pressed && styles.buttonPressed,
                        ]}>
                        <ThemedText type="smallBold" style={styles.primaryButtonText}>
                          Nuevo movimiento
                        </ThemedText>
                      </Pressable>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: BottomTabInset + Spacing.four,
  },
  content: {
    alignSelf: 'center',
    gap: 14,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.one,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 27,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  avatarText: {
    fontSize: 16,
  },
  greeting: {
    flex: 1,
    minWidth: 0,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 31,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  loadingState: {
    alignItems: 'center',
    gap: Spacing.three,
    justifyContent: 'center',
    minHeight: 360,
  },
  stateCard: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    justifyContent: 'center',
    minHeight: 280,
    padding: Spacing.four,
  },
  errorText: {
    color: '#C24B52',
    fontSize: 16,
  },
  stateText: {
    textAlign: 'center',
  },
  balanceCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 16,
    padding: 20,
  },
  balanceHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  sectionEyebrow: {
    fontSize: 16,
  },
  balanceAmount: {
    fontSize: 40,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    letterSpacing: -1.2,
    lineHeight: 48,
  },
  outlineButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.one,
    minHeight: 42,
    paddingHorizontal: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 12,
    minWidth: 0,
    padding: Spacing.three,
  },
  summaryAmount: {
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    lineHeight: 28,
  },
  summaryFooter: {
    alignItems: 'flex-start',
    gap: Spacing.one,
  },
  trendText: {
    fontSize: 12,
    lineHeight: 16,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.three,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  categoriesRow: {
    flexDirection: 'row',
  },
  categoryItem: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.one,
    minWidth: 0,
    paddingHorizontal: Spacing.one,
  },
  categoryNameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
    maxWidth: '100%',
  },
  categoryName: {
    flexShrink: 1,
    fontSize: 12,
  },
  categoryAmount: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  emptyText: {
    textAlign: 'center',
  },
  transactionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: 64,
    paddingVertical: 10,
  },
  transactionPressed: {
    opacity: 0.65,
  },
  transactionMain: {
    flex: 1,
    minWidth: 0,
  },
  transactionAmount: {
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  emptyMovements: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#208AEF',
    borderRadius: 9,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: Spacing.three,
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  buttonPressed: {
    opacity: 0.65,
  },
});
