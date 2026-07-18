import { useCallback, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
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

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Fonts, Spacing } from '@/constants/theme';
import { useAuthSession } from '@/features/auth/use-auth-session';
import { CategoryIcon } from '@/features/categories/components/category-icon';
import { SyncStatusModal } from '@/features/offline/components/sync-status-modal';
import { useSync } from '@/features/offline/sync-context';
import {
  formatCurrency,
  formatTransactionDate,
  getTransactionCategory,
  getTransactionCategoryName,
} from '@/features/transactions/formatters';
import { listTransactions } from '@/features/transactions/transactions.api';
import type { TransactionListItem } from '@/features/transactions/types';
import { getErrorMessage } from '@/lib/errors';

const palette = {
  background: '#FBF8F1',
  border: '#E4DAC9',
  cream: '#F6F0E5',
  expenseBackground: '#FBF2E8',
  expenseBorder: '#E9D4BE',
  ink: '#303A29',
  muted: '#77756E',
  olive: '#617149',
  oliveDark: '#4E5C39',
  olivePale: '#E5E7DB',
  surface: '#FEFCF7',
  terracotta: '#C45D32',
  white: '#FFFDF8',
} as const;

const decorations = {
  avatar: require('../../../../assets/decorations/hojas_icono.webp'),
  balance: require('../../../../assets/decorations/flores_balance.webp'),
  categories: require('../../../../assets/decorations/flores_vertical_1.webp'),
  expenses: require('../../../../assets/decorations/planta_gastos.webp'),
  income: require('../../../../assets/decorations/hojas_ingresos.webp'),
  movements: require('../../../../assets/decorations/planta_vertical_1.webp'),
};

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

function DashboardText({ style, themeColor, ...props }: ThemedTextProps) {
  return (
    <ThemedText
      {...props}
      style={[
        styles.dashboardText,
        themeColor === 'textSecondary' && styles.secondaryText,
        style,
      ]}
    />
  );
}

function getSoftCategoryColor(color?: string | null) {
  return color && /^#[0-9A-F]{6}$/i.test(color) ? `${color}22` : palette.olivePale;
}

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
      <DashboardText type="small" themeColor="textSecondary" style={styles.trendText}>
        — Sin datos
      </DashboardText>
    );
  }

  const isPositive =
    trend.direction === 'flat' || (trend.direction === 'up') !== Boolean(inverted);
  const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '—';

  return (
    <DashboardText
      type="smallBold"
      style={[styles.trendText, { color: isPositive ? palette.olive : palette.terracotta }]}>
      {arrow} {trend.percentage.toFixed(1)}%
    </DashboardText>
  );
}

export default function DashboardScreen() {
  const { offlineAccount, session } = useAuthSession();
  const { connectivity, pendingCount, revision, status, syncNow } = useSync();
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncDetailsVisible, setIsSyncDetailsVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const hasLoadedRef = useRef(false);

  const userName = getUserName(
    session?.user.email ?? offlineAccount?.email ?? undefined,
    session?.user.user_metadata?.user_name ?? offlineAccount?.userName,
  );
  const isSyncing = status === 'syncing';
  const hasSyncError = status === 'error';
  const syncAccessibilityLabel = `${
    isSyncing
      ? 'Sincronizando'
      : connectivity === 'offline'
        ? 'Sin conexión'
        : hasSyncError
          ? 'Problema de sincronización'
          : connectivity === 'online'
            ? 'Conectado'
            : 'Comprobando conexión'
  }${
    pendingCount > 0
      ? `, ${pendingCount} cambio${pendingCount === 1 ? '' : 's'} pendiente${pendingCount === 1 ? '' : 's'}`
      : ', sin cambios pendientes'
  }`;
  const syncIndicatorColor = hasSyncError
    ? '#B65336'
    : connectivity === 'offline'
      ? '#8B8B84'
      : connectivity === 'online'
        ? palette.olive
        : '#B9B5AC';

  const loadDashboard = useCallback(async (mode: 'initial' | 'refresh' | 'silent') => {
    setErrorMessage('');

    if (mode === 'initial') setIsLoading(true);
    if (mode === 'refresh') setIsRefreshing(true);

    try {
      if (mode === 'refresh') await syncNow();
      setTransactions(await listTransactions());
      hasLoadedRef.current = true;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [syncNow]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard(hasLoadedRef.current ? 'silent' : 'initial');
    }, [loadDashboard, revision]),
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
      .slice(0, 3)
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
    backgroundColor: palette.surface,
    borderColor: palette.border,
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
              tintColor={palette.olive}
            />
          }
          showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.avatarCluster}>
                <View style={styles.avatar}>
                  <DashboardText type="smallBold" style={styles.avatarText}>
                    {getInitials(userName)}
                  </DashboardText>
                </View>
                <Image
                  accessible={false}
                  contentFit="contain"
                  pointerEvents="none"
                  source={decorations.avatar}
                  style={styles.avatarDecoration}
                />
              </View>

              <View style={styles.greeting}>
                <DashboardText style={styles.greetingTitle} numberOfLines={1}>
                  Hola, {userName}
                </DashboardText>
                <View style={styles.greetingSubtitle}>
                  <DashboardText
                    type="small"
                    themeColor="textSecondary"
                    numberOfLines={1}
                    style={styles.greetingSubtitleText}>
                    Pa´eso chambeo
                  </DashboardText>
                  <SymbolView
                    name={{ android: 'eco', ios: 'leaf', web: 'eco' }}
                    size={13}
                    tintColor={palette.olive}
                  />
                </View>
              </View>

              <Pressable
                accessibilityHint="Abre el detalle de sincronización"
                accessibilityLabel={syncAccessibilityLabel}
                accessibilityRole="button"
                onPress={() => setIsSyncDetailsVisible(true)}
                style={({ pressed }) => [styles.iconButton, pressed && styles.buttonPressed]}>
                <SymbolView
                  name={{ android: 'notifications', ios: 'bell', web: 'notifications' }}
                  size={23}
                  tintColor={palette.oliveDark}
                />
                <View pointerEvents="none" style={styles.syncStateIndicator}>
                  {isSyncing ? (
                    <ActivityIndicator color={palette.olive} size={11} />
                  ) : (
                    <View
                      style={[styles.syncStateDot, { backgroundColor: syncIndicatorColor }]}
                    />
                  )}
                </View>
                {pendingCount > 0 ? (
                  <View pointerEvents="none" style={styles.pendingBadge}>
                    <DashboardText numberOfLines={1} style={styles.pendingBadgeText}>
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </DashboardText>
                  </View>
                ) : null}
              </Pressable>
            </View>

            {isLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator color={palette.olive} />
                <DashboardText type="small" themeColor="textSecondary">
                  Preparando tu resumen...
                </DashboardText>
              </View>
            ) : errorMessage ? (
              <View style={[styles.stateCard, cardColors]}>
                <DashboardText type="smallBold" style={styles.errorText}>
                  No pudimos cargar tu resumen
                </DashboardText>
                <DashboardText type="small" themeColor="textSecondary" style={styles.stateText}>
                  {errorMessage}
                </DashboardText>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => loadDashboard('initial')}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.buttonPressed,
                  ]}>
                  <DashboardText type="smallBold" style={styles.primaryButtonText}>
                    Reintentar
                  </DashboardText>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.balanceCard}>
                  <Image
                    accessible={false}
                    contentFit="contain"
                    pointerEvents="none"
                    source={decorations.balance}
                    style={styles.balanceDecoration}
                  />
                  <View style={styles.balanceContent}>
                    <View style={styles.balanceHeader}>
                      <DashboardText style={styles.sectionEyebrow}>Balance total</DashboardText>
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
                          size={20}
                          tintColor={palette.white}
                        />
                      </Pressable>
                    </View>

                    <DashboardText
                      style={styles.balanceAmount}
                      numberOfLines={1}
                      adjustsFontSizeToFit>
                      {isBalanceVisible ? formatCurrency(dashboard.balance) : '••••••'}
                    </DashboardText>

                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push('/transactions')}
                      style={({ pressed }) => [
                        styles.detailButton,
                        pressed && styles.buttonPressed,
                      ]}>
                      <DashboardText type="smallBold" style={styles.detailButtonText}>
                        Ver detalle
                      </DashboardText>
                      <SymbolView
                        name={{
                          android: 'chevron_right',
                          ios: 'chevron.right',
                          web: 'chevron_right',
                        }}
                        size={17}
                        tintColor={palette.white}
                      />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.summaryRow}>
                  <View style={[styles.summaryCard, styles.incomeCard]}>
                    <Image
                      accessible={false}
                      contentFit="contain"
                      pointerEvents="none"
                      source={decorations.income}
                      style={styles.incomeDecoration}
                    />
                    <View style={styles.summaryTitleRow}>
                      <DashboardText style={styles.summaryTitle}>Ingresos</DashboardText>
                      <View style={[styles.summaryIcon, styles.incomeIcon]}>
                        <SymbolView
                          name={{ android: 'eco', ios: 'leaf', web: 'eco' }}
                          size={20}
                          tintColor={palette.white}
                        />
                      </View>
                    </View>
                    <DashboardText
                      style={[styles.summaryAmount, styles.incomeAmount]}
                      numberOfLines={1}
                      adjustsFontSizeToFit>
                      {formatCurrency(dashboard.currentSummary.income)}
                    </DashboardText>
                    <View style={styles.summaryFooter}>
                      <DashboardText type="small" themeColor="textSecondary" style={styles.periodText}>
                        Este mes
                      </DashboardText>
                      <TrendLabel trend={dashboard.incomeTrend} />
                    </View>
                  </View>

                  <View style={[styles.summaryCard, styles.expenseCard]}>
                    <Image
                      accessible={false}
                      contentFit="contain"
                      pointerEvents="none"
                      source={decorations.expenses}
                      style={styles.expenseDecoration}
                    />
                    <View style={styles.summaryTitleRow}>
                      <DashboardText style={styles.summaryTitle}>Gastos</DashboardText>
                      <View style={[styles.summaryIcon, styles.expenseIcon]}>
                        <SymbolView
                          name={{ android: 'eco', ios: 'leaf', web: 'eco' }}
                          size={20}
                          tintColor={palette.white}
                        />
                      </View>
                    </View>
                    <DashboardText
                      style={[styles.summaryAmount, styles.expenseAmount]}
                      numberOfLines={1}
                      adjustsFontSizeToFit>
                      {formatCurrency(dashboard.currentSummary.expenses)}
                    </DashboardText>
                    <View style={styles.summaryFooter}>
                      <DashboardText type="small" themeColor="textSecondary" style={styles.periodText}>
                        Este mes
                      </DashboardText>
                      <TrendLabel inverted trend={dashboard.expenseTrend} />
                    </View>
                  </View>
                </View>

                <View style={[styles.sectionCard, cardColors]}>
                  <Image
                    accessible={false}
                    contentFit="contain"
                    pointerEvents="none"
                    source={decorations.categories}
                    style={styles.categoriesDecoration}
                  />
                  <View style={styles.sectionHeader}>
                    <DashboardText style={styles.sectionTitle}>Gastos por categoría</DashboardText>
                    <Pressable
                      accessibilityHint="Abre la pantalla de reportes"
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => router.push('/reports')}
                      style={({ pressed }) => [
                        styles.sectionAction,
                        pressed && styles.buttonPressed,
                      ]}>
                      <DashboardText type="small" style={styles.sectionActionText}>
                        Ver todas
                      </DashboardText>
                      <SymbolView
                        name={{ android: 'chevron_right', ios: 'chevron.right', web: 'chevron_right' }}
                        size={16}
                        tintColor={palette.muted}
                      />
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
                              borderLeftColor: palette.border,
                              borderLeftWidth: StyleSheet.hairlineWidth,
                            },
                          ]}>
                          <CategoryIcon
                            backgroundColor={getSoftCategoryColor(category.color)}
                            iconColor={category.color || palette.olive}
                            iconKey={category.icon_key}
                            size={48}
                            symbolSize={23}
                          />
                          <DashboardText
                            type="smallBold"
                            numberOfLines={1}
                            style={styles.categoryName}>
                            {category.name}
                          </DashboardText>
                          <DashboardText type="small" numberOfLines={1} style={styles.categoryAmount}>
                            {formatCurrency(category.amount)}
                          </DashboardText>
                          <DashboardText
                            type="smallBold"
                            style={[styles.categoryPercentage, { color: category.color || palette.olive }]}>
                            {category.percentage.toFixed(0)}%
                          </DashboardText>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <DashboardText type="small" themeColor="textSecondary" style={styles.emptyText}>
                      Aún no hay gastos registrados este mes.
                    </DashboardText>
                  )}
                </View>

                <View style={[styles.sectionCard, cardColors]}>
                  <Image
                    accessible={false}
                    contentFit="contain"
                    pointerEvents="none"
                    source={decorations.movements}
                    style={styles.movementsDecoration}
                  />
                  <View style={styles.sectionHeader}>
                    <DashboardText style={styles.sectionTitle}>Movimientos recientes</DashboardText>
                    <Pressable
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => router.push('/transactions')}
                      style={({ pressed }) => [styles.sectionAction, pressed && styles.buttonPressed]}>
                      <DashboardText type="small" style={styles.sectionActionText}>
                        Ver todos
                      </DashboardText>
                      <SymbolView
                        name={{ android: 'chevron_right', ios: 'chevron.right', web: 'chevron_right' }}
                        size={16}
                        tintColor={palette.muted}
                      />
                    </Pressable>
                  </View>

                  {dashboard.recentTransactions.length ? (
                    <View style={styles.transactionsList}>
                      {dashboard.recentTransactions.map((transaction, index) => {
                        const isIncome = transaction.type === 'income';
                        const category = getTransactionCategory(transaction);
                        const categoryColor = category?.color || palette.olive;

                        return (
                          <Pressable
                            accessibilityHint="Abre el detalle de este movimiento"
                            accessibilityRole="button"
                            key={transaction.id}
                            onPress={() => openTransaction(transaction.id)}
                            style={({ pressed }) => [
                              styles.transactionRow,
                              index > 0 && {
                                borderTopColor: palette.border,
                                borderTopWidth: StyleSheet.hairlineWidth,
                              },
                              pressed && styles.transactionPressed,
                            ]}>
                            <CategoryIcon
                              backgroundColor={getSoftCategoryColor(categoryColor)}
                              iconColor={categoryColor}
                              iconKey={category?.icon_key}
                              size={42}
                              symbolSize={21}
                            />
                            <View style={styles.transactionMain}>
                              <DashboardText type="smallBold" numberOfLines={1} style={styles.transactionTitle}>
                                {transaction.description || getTransactionCategoryName(transaction)}
                              </DashboardText>
                              <DashboardText
                                type="small"
                                themeColor="textSecondary"
                                numberOfLines={1}
                                style={styles.transactionSubtitle}>
                                {getTransactionCategoryName(transaction)} ·{' '}
                                {formatTransactionDate(transaction.transaction_date)}
                              </DashboardText>
                            </View>

                            <DashboardText
                              type="smallBold"
                              style={[
                                styles.transactionAmount,
                                { color: isIncome ? palette.olive : palette.terracotta },
                              ]}>
                              {isIncome ? '+' : '-'}
                              {formatCurrency(transaction.amount)}
                            </DashboardText>

                            <SymbolView
                              name={{
                                android: 'chevron_right',
                                ios: 'chevron.right',
                                web: 'chevron_right',
                              }}
                              size={18}
                              tintColor={palette.muted}
                            />
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.emptyMovements}>
                      <DashboardText type="small" themeColor="textSecondary" style={styles.emptyText}>
                        Tus movimientos aparecerán aquí cuando registres el primero.
                      </DashboardText>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => router.push('/transaction/new')}
                        style={({ pressed }) => [
                          styles.primaryButton,
                          pressed && styles.buttonPressed,
                        ]}>
                        <DashboardText type="smallBold" style={styles.primaryButtonText}>
                          Nuevo movimiento
                        </DashboardText>
                      </Pressable>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
      <SyncStatusModal
        onClose={() => setIsSyncDetailsVisible(false)}
        visible={isSyncDetailsVisible}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.background,
    flex: 1,
  },
  safeArea: {
    backgroundColor: palette.background,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: BottomTabInset + Spacing.six,
  },
  content: {
    alignSelf: 'center',
    gap: 12,
    maxWidth: 560,
    paddingHorizontal: Spacing.three,
    paddingTop: 10,
    width: '100%',
  },
  dashboardText: {
    color: palette.ink,
    fontFamily: Fonts.serif,
  },
  secondaryText: {
    color: palette.muted,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: 8,
    minHeight: 68,
  },
  avatarCluster: {
    height: 64,
    position: 'relative',
    width: 72,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#7D8866',
    borderRadius: 29,
    height: 58,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    top: 3,
    width: 58,
    zIndex: 1,
  },
  avatarDecoration: {
    height: 78,
    left: 43,
    position: 'absolute',
    top: -8,
    width: 25,
    zIndex: 2,
  },
  avatarText: {
    color: palette.white,
    fontSize: 21,
    fontWeight: '500',
    lineHeight: 27,
  },
  greeting: {
    flex: 1,
    minWidth: 0,
  },
  greetingTitle: {
    color: palette.ink,
    fontSize: 27,
    fontWeight: '500',
    letterSpacing: -0.5,
    lineHeight: 33,
  },
  greetingSubtitle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  greetingSubtitleText: {
    flexShrink: 1,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: palette.cream,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    position: 'relative',
    width: 48,
  },
  syncStateIndicator: {
    alignItems: 'center',
    backgroundColor: palette.white,
    borderColor: palette.background,
    borderRadius: 9,
    borderWidth: 2,
    bottom: -1,
    height: 18,
    justifyContent: 'center',
    position: 'absolute',
    right: -1,
    width: 18,
  },
  syncStateDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  pendingBadge: {
    alignItems: 'center',
    backgroundColor: palette.terracotta,
    borderColor: palette.background,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 20,
    minWidth: 20,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -6,
    top: -6,
  },
  pendingBadgeText: {
    color: palette.white,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    lineHeight: 12,
  },
  loadingState: {
    alignItems: 'center',
    gap: Spacing.three,
    justifyContent: 'center',
    minHeight: 360,
  },
  stateCard: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    justifyContent: 'center',
    minHeight: 280,
    padding: Spacing.four,
  },
  errorText: {
    color: palette.terracotta,
    fontSize: 16,
  },
  stateText: {
    textAlign: 'center',
  },
  balanceCard: {
    backgroundColor: '#969D83',
    borderColor: '#878E73',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 3,
    minHeight: 186,
    overflow: 'hidden',
    padding: 20,
    position: 'relative',
    shadowColor: '#4D503E',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 9,
  },
  balanceDecoration: {
    bottom: -42,
    height: 235,
    opacity: 0.9,
    position: 'absolute',
    right: -18,
    width: 205,
  },
  balanceContent: {
    alignItems: 'flex-start',
    gap: 12,
    maxWidth: '76%',
    zIndex: 1,
  },
  balanceHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  sectionEyebrow: {
    color: palette.white,
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 23,
  },
  balanceAmount: {
    color: palette.white,
    fontSize: 46,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
    letterSpacing: -1,
    lineHeight: 54,
  },
  detailButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: palette.oliveDark,
    borderRadius: 22,
    flexDirection: 'row',
    gap: 7,
    minHeight: 40,
    paddingHorizontal: 16,
  },
  detailButtonText: {
    color: palette.white,
    fontSize: 15,
    fontWeight: '500',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    gap: 9,
    minHeight: 160,
    minWidth: 0,
    overflow: 'hidden',
    padding: 15,
    position: 'relative',
  },
  incomeCard: {
    backgroundColor: '#F8F6EE',
    borderColor: '#DDDCCB',
    overflow: 'visible',
  },
  expenseCard: {
    backgroundColor: palette.expenseBackground,
    borderColor: palette.expenseBorder,
    overflow: 'visible',
  },
  incomeDecoration: {
    bottom: -33,
    height: 61,
    left: -5,
    opacity: 0.92,
    position: 'absolute',
    width: 88,
    transform: [{ rotate: '30deg' }],
  },
  expenseDecoration: {
    bottom: -1,
    height: 112,
    opacity: 0.88,
    position: 'absolute',
    right: -10,
    width: 57,
  },
  summaryTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  summaryTitle: {
    fontSize: 19,
    fontWeight: '500',
    lineHeight: 25,
  },
  summaryIcon: {
    alignItems: 'center',
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  incomeIcon: {
    backgroundColor: '#8B9672',
  },
  expenseIcon: {
    backgroundColor: palette.terracotta,
  },
  summaryAmount: {
    fontSize: 25,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
    letterSpacing: -0.35,
    lineHeight: 31,
    zIndex: 1,
  },
  incomeAmount: {
    color: palette.olive,
  },
  expenseAmount: {
    color: palette.terracotta,
  },
  summaryFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
    marginTop: 'auto',
    zIndex: 1,
  },
  periodText: {
    fontSize: 13,
  },
  trendText: {
    fontSize: 14,
    lineHeight: 18,
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    padding: Spacing.three,
    position: 'relative',
  },
  categoriesDecoration: {
    bottom: -15,
    height: 112,
    opacity: 0.7,
    position: 'absolute',
    right: -2,
    width: 45,
  },
  movementsDecoration: {
    bottom: -18,
    height: 165,
    opacity: 0.68,
    position: 'absolute',
    right: -4,
    width: 59,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
    marginBottom: 14,
    zIndex: 1,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 21,
    fontWeight: '500',
    letterSpacing: -0.25,
    lineHeight: 27,
  },
  sectionAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  sectionActionText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '500',
  },
  categoriesRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
    minHeight: 120,
    zIndex: 1,
  },
  categoryItem: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 5,
  },
  categoryName: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
    maxWidth: '100%',
  },
  categoryAmount: {
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    lineHeight: 22,
  },
  categoryPercentage: {
    fontSize: 14,
    lineHeight: 19,
  },
  emptyText: {
    paddingVertical: Spacing.three,
    textAlign: 'center',
  },
  transactionsList: {
    zIndex: 1,
  },
  transactionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 72,
    paddingVertical: 10,
  },
  transactionPressed: {
    opacity: 0.65,
  },
  transactionMain: {
    flex: 1,
    minWidth: 0,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 21,
  },
  transactionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  transactionAmount: {
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
    lineHeight: 21,
    maxWidth: 105,
    textAlign: 'right',
  },
  emptyMovements: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: palette.oliveDark,
    borderRadius: 22,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: Spacing.three,
  },
  primaryButtonText: {
    color: palette.white,
  },
  buttonPressed: {
    opacity: 0.65,
  },
});
