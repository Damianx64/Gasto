import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { router, type Href, useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
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
  getTransactionAmount,
  getTransactionCategory,
  getTransactionCategoryName,
  getTransactionImpact,
  getTransactionWalletName,
} from '@/features/transactions/formatters';
import { listTransactions } from '@/features/transactions/transactions.api';
import type { TransactionListItem } from '@/features/transactions/types';
import { useWalletScope } from '@/features/wallets/wallet-scope-context';
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

const BALANCE_DOT_SIZE = 8;
const BALANCE_DOT_GAP = 7;
const BALANCE_DOT_STEP = BALANCE_DOT_SIZE + BALANCE_DOT_GAP;

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
  transfersReceived: number;
  transfersSent: number;
};

type Trend = {
  direction: 'down' | 'flat' | 'up';
  percentage: number;
};

type BalanceCardData = {
  balance: number;
  name: string;
  walletId: string | null;
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

function summarizeMonth(
  transactions: TransactionListItem[],
  monthKey: string,
  walletId: string | null,
): MonthSummary {
  return transactions.reduce<MonthSummary>(
    (summary, transaction) => {
      if (!transaction.transaction_date.startsWith(monthKey)) return summary;

      const amount = getTransactionAmount(transaction);

      if (transaction.type === 'transfer') {
        if (walletId && transaction.destination_wallet_id === walletId) {
          summary.transfersReceived += amount;
        }
        if (walletId && transaction.wallet_id === walletId) {
          summary.transfersSent += amount;
        }
        return summary;
      }

      if (transaction.type === 'income') {
        summary.income += amount;
      } else {
        summary.expenses += amount;
      }

      return summary;
    },
    { expenses: 0, income: 0, transfersReceived: 0, transfersSent: 0 },
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
  const { width: windowWidth } = useWindowDimensions();
  const { offlineAccount, session } = useAuthSession();
  const { connectivity, pendingCount, revision, status, syncNow } = useSync();
  const { selectedWalletId, setSelectedWalletId, wallets } = useWalletScope();
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncDetailsVisible, setIsSyncDetailsVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [balanceCardWidth, setBalanceCardWidth] = useState(() =>
    Math.max(0, Math.min(windowWidth, 560) - Spacing.three * 2),
  );
  const [isIncomeDetailsExpanded, setIsIncomeDetailsExpanded] = useState(false);
  const [isExpenseDetailsExpanded, setIsExpenseDetailsExpanded] = useState(false);
  const hasLoadedRef = useRef(false);
  const hasAnimatedWalletChangeRef = useRef(false);
  const transactionsRef = useRef<TransactionListItem[]>([]);
  const balanceCarouselRef = useRef<ScrollView>(null);
  const isDraggingBalanceRef = useRef(false);
  const isDashboardFocusedRef = useRef(false);
  const balanceScrollX = useRef(new Animated.Value(0)).current;
  const summaryFade = useRef(new Animated.Value(1)).current;
  const incomeDetailsProgress = useRef(new Animated.Value(0)).current;
  const expenseDetailsProgress = useRef(new Animated.Value(0)).current;
  const categoriesFade = useRef(new Animated.Value(1)).current;
  const movementsFade = useRef(new Animated.Value(1)).current;
  const numbersOpacity = useRef(new Animated.Value(1)).current;
  const numbersTranslateY = useRef(new Animated.Value(0)).current;
  const numbersScale = useRef(new Animated.Value(1)).current;
  const numberTransitionStyle = useMemo(
    () => ({
      opacity: numbersOpacity,
      transform: [{ translateY: numbersTranslateY }, { scale: numbersScale }],
    }),
    [numbersOpacity, numbersScale, numbersTranslateY],
  );

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

  const replaceTransactions = useCallback(async (
    nextTransactions: TransactionListItem[],
    animateChanges: boolean,
  ) => {
    const hasChanged = JSON.stringify(transactionsRef.current) !== JSON.stringify(nextTransactions);

    if (!animateChanges || !hasLoadedRef.current || !hasChanged) {
      numbersOpacity.stopAnimation();
      numbersTranslateY.stopAnimation();
      numbersScale.stopAnimation();
      numbersOpacity.setValue(1);
      numbersTranslateY.setValue(0);
      numbersScale.setValue(1);
      transactionsRef.current = nextTransactions;
      setTransactions(nextTransactions);
      return;
    }

    await new Promise<void>((resolve) => {
      numbersOpacity.stopAnimation();
      numbersTranslateY.stopAnimation();
      numbersScale.stopAnimation();
      Animated.parallel([
        Animated.timing(numbersOpacity, {
          duration: 180,
          easing: Easing.bezier(0.4, 0, 1, 1),
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(numbersTranslateY, {
          duration: 180,
          easing: Easing.inOut(Easing.cubic),
          toValue: -2,
          useNativeDriver: true,
        }),
        Animated.timing(numbersScale, {
          duration: 180,
          easing: Easing.inOut(Easing.cubic),
          toValue: 0.995,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!finished) {
          resolve();
          return;
        }

        numbersOpacity.setValue(0);
        numbersTranslateY.setValue(3);
        numbersScale.setValue(0.99);
        transactionsRef.current = nextTransactions;
        setTransactions(nextTransactions);
        requestAnimationFrame(() => {
          Animated.parallel([
            Animated.timing(numbersOpacity, {
              duration: 300,
              easing: Easing.bezier(0, 0, 0.2, 1),
              toValue: 1,
              useNativeDriver: true,
            }),
            Animated.timing(numbersTranslateY, {
              duration: 340,
              easing: Easing.out(Easing.cubic),
              toValue: 0,
              useNativeDriver: true,
            }),
            Animated.timing(numbersScale, {
              duration: 340,
              easing: Easing.out(Easing.cubic),
              toValue: 1,
              useNativeDriver: true,
            }),
          ]).start(() => resolve());
        });
      });
    });
  }, [numbersOpacity, numbersScale, numbersTranslateY]);

  const loadDashboard = useCallback(async (mode: 'initial' | 'refresh' | 'silent') => {
    setErrorMessage('');

    if (mode === 'initial') setIsLoading(true);
    if (mode === 'refresh') setIsRefreshing(true);

    try {
      if (mode === 'refresh') await syncNow();
      await replaceTransactions(await listTransactions(), mode === 'silent');
      hasLoadedRef.current = true;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [replaceTransactions, syncNow]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard(hasLoadedRef.current ? 'silent' : 'initial');
    }, [loadDashboard, revision]),
  );

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (!selectedWalletId) return false;

        setSelectedWalletId(null, { animateLinkedScreens: true });
        return true;
      });

      return () => subscription.remove();
    }, [selectedWalletId, setSelectedWalletId]),
  );

  const scopedTransactions = useMemo(
    () =>
      selectedWalletId
        ? transactions.filter(
            (transaction) =>
              transaction.wallet_id === selectedWalletId ||
              transaction.destination_wallet_id === selectedWalletId,
          )
        : transactions,
    [selectedWalletId, transactions],
  );

  const balanceCards = useMemo<BalanceCardData[]>(() => {
    const getBalance = (items: TransactionListItem[], walletId: string | null) =>
      items.reduce((balance, transaction) => {
        return balance + getTransactionImpact(transaction, walletId);
      }, 0);

    return [
      { balance: getBalance(transactions, null), name: 'Balance general', walletId: null },
      ...wallets.map((wallet) => ({
        balance: getBalance(
          transactions.filter(
            (transaction) =>
              transaction.wallet_id === wallet.id ||
              transaction.destination_wallet_id === wallet.id,
          ),
          wallet.id,
        ),
        name: wallet.name,
        walletId: wallet.id,
      })),
    ];
  }, [transactions, wallets]);

  const selectedBalanceIndex = selectedWalletId
    ? Math.max(0, wallets.findIndex((wallet) => wallet.id === selectedWalletId) + 1)
    : 0;
  const balanceContentOffset = useMemo(
    () => ({ x: selectedBalanceIndex * balanceCardWidth, y: 0 }),
    [balanceCardWidth, selectedBalanceIndex],
  );
  useLayoutEffect(() => {
    if (balanceCardWidth) balanceScrollX.setValue(balanceContentOffset.x);
  }, [balanceCardWidth, balanceContentOffset.x, balanceScrollX]);
  const alignBalanceCarousel = useCallback(() => {
    if (!balanceCardWidth || !isDashboardFocusedRef.current || isDraggingBalanceRef.current) return;
    const targetX = selectedBalanceIndex * balanceCardWidth;
    balanceCarouselRef.current?.scrollTo({ animated: false, x: targetX, y: 0 });
    balanceScrollX.setValue(targetX);
  }, [balanceCardWidth, balanceScrollX, selectedBalanceIndex]);

  useFocusEffect(
    useCallback(() => {
      isDashboardFocusedRef.current = true;
      isDraggingBalanceRef.current = false;
      balanceScrollX.setValue(balanceContentOffset.x);
      const frame = requestAnimationFrame(alignBalanceCarousel);
      // Android can restore the native scroll offset after the focus callback runs.
      const settleTimer = setTimeout(alignBalanceCarousel, 450);

      return () => {
        isDashboardFocusedRef.current = false;
        cancelAnimationFrame(frame);
        clearTimeout(settleTimer);
        isDraggingBalanceRef.current = false;
      };
    }, [alignBalanceCarousel, balanceContentOffset.x, balanceScrollX]),
  );

  useLayoutEffect(() => {
    if (!hasAnimatedWalletChangeRef.current) {
      hasAnimatedWalletChangeRef.current = true;
      return;
    }

    const fadeValues = [summaryFade, categoriesFade, movementsFade];
    fadeValues.forEach((value) => {
      value.stopAnimation();
      value.setValue(0);
    });

    const animation = Animated.parallel([
      Animated.timing(summaryFade, {
        duration: 150,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(categoriesFade, {
        delay: 20,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(movementsFade, {
        delay: 40,
        duration: 170,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [categoriesFade, movementsFade, selectedWalletId, summaryFade]);

  const dashboard = useMemo(() => {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentSummary = summarizeMonth(
      scopedTransactions,
      getMonthKey(now),
      selectedWalletId,
    );
    const previousSummary = summarizeMonth(
      scopedTransactions,
      getMonthKey(previousMonth),
      selectedWalletId,
    );
    const categoryMap = new Map<string, Omit<CategorySummary, 'percentage'>>();

    let balance = 0;

    for (const transaction of scopedTransactions) {
      const amount = getTransactionAmount(transaction);
      balance += getTransactionImpact(transaction, selectedWalletId);

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
      recentTransactions: scopedTransactions.slice(0, 6),
    };
  }, [scopedTransactions, selectedWalletId]);

  function toggleSummaryDetails(type: 'expense' | 'income') {
    const isIncome = type === 'income';
    const isExpanded = isIncome ? isIncomeDetailsExpanded : isExpenseDetailsExpanded;
    const progress = isIncome ? incomeDetailsProgress : expenseDetailsProgress;

    if (isIncome) {
      setIsIncomeDetailsExpanded(!isExpanded);
    } else {
      setIsExpenseDetailsExpanded(!isExpanded);
    }

    Animated.timing(progress, {
      duration: 340,
      easing: Easing.inOut(Easing.cubic),
      toValue: isExpanded ? 0 : 1,
      useNativeDriver: false,
    }).start();
  }

  const cardColors = {
    backgroundColor: palette.surface,
    borderColor: palette.border,
  };

  const balanceDotAnimation = useMemo(() => {
    if (!balanceCardWidth || balanceCards.length < 2) return null;

    const inputRange = [0];
    const translateOutputRange = [0];
    const widthOutputRange = [BALANCE_DOT_SIZE];

    for (let index = 0; index < balanceCards.length - 1; index += 1) {
      inputRange.push((index + 0.5) * balanceCardWidth, (index + 1) * balanceCardWidth);
      translateOutputRange.push(index * BALANCE_DOT_STEP, (index + 1) * BALANCE_DOT_STEP);
      widthOutputRange.push(BALANCE_DOT_SIZE + BALANCE_DOT_STEP, BALANCE_DOT_SIZE);
    }

    return {
      transform: [
        {
          translateX: balanceScrollX.interpolate({
            extrapolate: 'clamp',
            inputRange,
            outputRange: translateOutputRange,
          }),
        },
      ],
      width: balanceScrollX.interpolate({
        extrapolate: 'clamp',
        inputRange,
        outputRange: widthOutputRange,
      }),
    };
  }, [balanceCardWidth, balanceCards.length, balanceScrollX]);

  const walletContentFadeStyles = useMemo(
    () => ({
      categories: {
        opacity: categoriesFade,
        transform: [
          {
            translateY: categoriesFade.interpolate({
              inputRange: [0, 1],
              outputRange: [4, 0],
            }),
          },
        ],
      },
      movements: {
        opacity: movementsFade,
        transform: [
          {
            translateY: movementsFade.interpolate({
              inputRange: [0, 1],
              outputRange: [4, 0],
            }),
          },
        ],
      },
      summary: {
        opacity: summaryFade,
        transform: [
          {
            translateY: summaryFade.interpolate({
              inputRange: [0, 1],
              outputRange: [3, 0],
            }),
          },
        ],
      },
    }),
    [categoriesFade, movementsFade, summaryFade],
  );

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
                    ¡Qué bueno verte por aquí!
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
                <View
                  accessibilityLabel="Selector de billetera"
                  onLayout={(event) => {
                    setBalanceCardWidth(event.nativeEvent.layout.width);
                    requestAnimationFrame(alignBalanceCarousel);
                  }}
                  style={styles.balanceCarousel}>
                  <Animated.ScrollView
                    contentOffset={balanceContentOffset}
                    horizontal
                    nestedScrollEnabled
                    onContentSizeChange={() => requestAnimationFrame(alignBalanceCarousel)}
                    onScroll={(event) => {
                      if (isDraggingBalanceRef.current) {
                        balanceScrollX.setValue(event.nativeEvent.contentOffset.x);
                      }
                    }}
                    onScrollBeginDrag={() => {
                      isDraggingBalanceRef.current = true;
                    }}
                    onMomentumScrollEnd={(event) => {
                      if (!balanceCardWidth || !isDraggingBalanceRef.current) return;
                      isDraggingBalanceRef.current = false;
                      const index = Math.max(
                        0,
                        Math.min(
                          balanceCards.length - 1,
                          Math.round(event.nativeEvent.contentOffset.x / balanceCardWidth),
                        ),
                      );
                      setSelectedWalletId(balanceCards[index]?.walletId ?? null, {
                        animateLinkedScreens: true,
                      });
                    }}
                    pagingEnabled
                    ref={balanceCarouselRef}
                    scrollEnabled={balanceCards.length > 1}
                    scrollEventThrottle={16}
                    showsHorizontalScrollIndicator={false}>
                    {balanceCards.map((card) => (
                      <View
                        key={card.walletId ?? 'general'}
                        style={[
                          styles.balancePage,
                          balanceCardWidth
                            ? { width: balanceCardWidth }
                            : styles.balancePageFallback,
                        ]}>
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
                              <DashboardText numberOfLines={1} style={styles.sectionEyebrow}>
                                {card.name}
                              </DashboardText>
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

                            <Animated.View style={numberTransitionStyle}>
                              <DashboardText
                                adjustsFontSizeToFit
                                numberOfLines={1}
                                style={styles.balanceAmount}>
                                {isBalanceVisible ? formatCurrency(card.balance) : '••••••'}
                              </DashboardText>
                            </Animated.View>

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
                      </View>
                    ))}
                  </Animated.ScrollView>
                  {balanceCards.length > 1 ? (
                    <View accessibilityRole="tablist" style={styles.balanceDots}>
                      <View style={styles.balanceDotsTrack}>
                        {balanceCards.map((card) => {
                          const isSelected = card.walletId === selectedWalletId;
                          return (
                            <Pressable
                              accessibilityLabel={`Mostrar ${card.name}`}
                              accessibilityRole="tab"
                              accessibilityState={{ selected: isSelected }}
                              hitSlop={8}
                              key={card.walletId ?? 'general-dot'}
                              onPress={() =>
                                setSelectedWalletId(card.walletId, {
                                  animateLinkedScreens: true,
                                })
                              }
                              style={styles.balanceDot}
                            />
                          );
                        })}
                        {balanceDotAnimation ? (
                          <Animated.View
                            pointerEvents="none"
                            style={[styles.balanceDotActive, balanceDotAnimation]}
                          />
                        ) : null}
                      </View>
                    </View>
                  ) : null}
                </View>

                <View style={styles.summaryRow}>
                  <Pressable
                    accessibilityHint={
                      selectedWalletId
                        ? 'Muestra u oculta las transferencias recibidas'
                        : undefined
                    }
                    accessibilityRole="button"
                    accessibilityState={{
                      disabled: !selectedWalletId,
                      expanded: Boolean(selectedWalletId && isIncomeDetailsExpanded),
                    }}
                    disabled={!selectedWalletId}
                    onPress={() => toggleSummaryDetails('income')}
                    style={({ pressed }) => [
                      styles.summaryCard,
                      styles.incomeCard,
                      pressed && styles.buttonPressed,
                    ]}>
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
                    <Animated.View style={[styles.summaryData, walletContentFadeStyles.summary]}>
                      <Animated.View style={numberTransitionStyle}>
                        <DashboardText
                          style={[styles.summaryAmount, styles.incomeAmount]}
                          numberOfLines={1}
                          adjustsFontSizeToFit>
                          {formatCurrency(dashboard.currentSummary.income)}
                        </DashboardText>
                      </Animated.View>
                      <View style={styles.summaryFooter}>
                        <DashboardText type="small" themeColor="textSecondary" style={styles.periodText}>
                          Este mes
                        </DashboardText>
                        <Animated.View style={numberTransitionStyle}>
                          <TrendLabel trend={dashboard.incomeTrend} />
                        </Animated.View>
                      </View>
                    </Animated.View>
                    <Animated.View
                      style={[
                        styles.transferSummaryDetail,
                        {
                          height: selectedWalletId
                            ? incomeDetailsProgress.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 54],
                              })
                            : 0,
                          opacity: selectedWalletId ? incomeDetailsProgress : 0,
                        },
                      ]}>
                      <View style={styles.transferSummaryDivider} />
                      <DashboardText
                        numberOfLines={1}
                        themeColor="textSecondary"
                        style={styles.transferSummaryLabel}>
                        Transferencias recibidas
                      </DashboardText>
                      <Animated.View style={numberTransitionStyle}>
                        <DashboardText
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          style={[styles.transferSummaryAmount, styles.incomeAmount]}>
                          {formatCurrency(dashboard.currentSummary.transfersReceived)}
                        </DashboardText>
                      </Animated.View>
                    </Animated.View>
                  </Pressable>

                  <Pressable
                    accessibilityHint={
                      selectedWalletId
                        ? 'Muestra u oculta las transferencias enviadas'
                        : undefined
                    }
                    accessibilityRole="button"
                    accessibilityState={{
                      disabled: !selectedWalletId,
                      expanded: Boolean(selectedWalletId && isExpenseDetailsExpanded),
                    }}
                    disabled={!selectedWalletId}
                    onPress={() => toggleSummaryDetails('expense')}
                    style={({ pressed }) => [
                      styles.summaryCard,
                      styles.expenseCard,
                      pressed && styles.buttonPressed,
                    ]}>
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
                    <Animated.View style={[styles.summaryData, walletContentFadeStyles.summary]}>
                      <Animated.View style={numberTransitionStyle}>
                        <DashboardText
                          style={[styles.summaryAmount, styles.expenseAmount]}
                          numberOfLines={1}
                          adjustsFontSizeToFit>
                          {formatCurrency(dashboard.currentSummary.expenses)}
                        </DashboardText>
                      </Animated.View>
                      <View style={styles.summaryFooter}>
                        <DashboardText type="small" themeColor="textSecondary" style={styles.periodText}>
                          Este mes
                        </DashboardText>
                        <Animated.View style={numberTransitionStyle}>
                          <TrendLabel inverted trend={dashboard.expenseTrend} />
                        </Animated.View>
                      </View>
                    </Animated.View>
                    <Animated.View
                      style={[
                        styles.transferSummaryDetail,
                        {
                          height: selectedWalletId
                            ? expenseDetailsProgress.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 54],
                              })
                            : 0,
                          opacity: selectedWalletId ? expenseDetailsProgress : 0,
                        },
                      ]}>
                      <View style={styles.transferSummaryDivider} />
                      <DashboardText
                        numberOfLines={1}
                        themeColor="textSecondary"
                        style={styles.transferSummaryLabel}>
                        Transferencias enviadas
                      </DashboardText>
                      <Animated.View style={numberTransitionStyle}>
                        <DashboardText
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          style={[styles.transferSummaryAmount, styles.expenseAmount]}>
                          {formatCurrency(dashboard.currentSummary.transfersSent)}
                        </DashboardText>
                      </Animated.View>
                    </Animated.View>
                  </Pressable>
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

                  <Animated.View
                    style={[styles.animatedSectionContent, walletContentFadeStyles.categories]}>
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
                            <Animated.View style={numberTransitionStyle}>
                              <DashboardText type="small" numberOfLines={1} style={styles.categoryAmount}>
                                {formatCurrency(category.amount)}
                              </DashboardText>
                            </Animated.View>
                            <Animated.View style={numberTransitionStyle}>
                              <DashboardText
                                type="smallBold"
                                style={[styles.categoryPercentage, { color: category.color || palette.olive }]}>
                                {category.percentage.toFixed(0)}%
                              </DashboardText>
                            </Animated.View>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <DashboardText type="small" themeColor="textSecondary" style={styles.emptyText}>
                        Aún no hay gastos registrados este mes.
                      </DashboardText>
                    )}
                  </Animated.View>
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

                  <Animated.View
                    style={[styles.animatedSectionContent, walletContentFadeStyles.movements]}>
                    {dashboard.recentTransactions.length ? (
                      <View style={styles.transactionsList}>
                      {dashboard.recentTransactions.map((transaction, index) => {
                        const isTransfer = transaction.type === 'transfer';
                        const isIncome = transaction.type === 'income';
                        const category = getTransactionCategory(transaction);
                        const categoryColor = category?.color || palette.olive;
                        const impact = getTransactionImpact(transaction, selectedWalletId);
                        const amountPrefix = isTransfer && !selectedWalletId
                          ? ''
                          : impact >= 0
                            ? '+'
                            : '-';
                        const amountColor = isTransfer && !selectedWalletId
                          ? palette.oliveDark
                          : impact >= 0
                            ? palette.olive
                            : palette.terracotta;

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
                            {isTransfer ? (
                              <View style={styles.transferIcon}>
                                <SymbolView
                                  name={{
                                    android: 'swap_horiz',
                                    ios: 'arrow.left.arrow.right',
                                    web: 'swap_horiz',
                                  }}
                                  size={23}
                                  tintColor={palette.oliveDark}
                                />
                              </View>
                            ) : (
                              <CategoryIcon
                                backgroundColor={getSoftCategoryColor(categoryColor)}
                                iconColor={categoryColor}
                                iconKey={category?.icon_key}
                                size={42}
                                symbolSize={21}
                              />
                            )}
                            <View style={styles.transactionMain}>
                              <DashboardText type="smallBold" numberOfLines={1} style={styles.transactionTitle}>
                                {transaction.description || (isTransfer
                                  ? 'Transferencia interna'
                                  : getTransactionCategoryName(transaction))}
                              </DashboardText>
                              <DashboardText
                                type="small"
                                themeColor="textSecondary"
                                numberOfLines={1}
                                style={styles.transactionSubtitle}>
                                {isTransfer
                                  ? `${getTransactionWalletName(transaction.source_wallet)} → ${getTransactionWalletName(transaction.destination_wallet)}`
                                  : getTransactionCategoryName(transaction)} ·{' '}
                                {formatTransactionDate(transaction.transaction_date)}
                              </DashboardText>
                            </View>

                            <Animated.View style={numberTransitionStyle}>
                              <DashboardText
                                type="smallBold"
                                style={[
                                  styles.transactionAmount,
                                  { color: isTransfer ? amountColor : isIncome ? palette.olive : palette.terracotta },
                                ]}>
                                {isTransfer ? amountPrefix : isIncome ? '+' : '-'}
                                {formatCurrency(transaction.amount)}
                              </DashboardText>
                            </Animated.View>

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
                  </Animated.View>
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
  balanceCarousel: {
    gap: 8,
    overflow: 'hidden',
    width: '100%',
  },
  balancePage: {
    paddingHorizontal: 1,
  },
  balancePageFallback: {
    width: '100%',
  },
  balanceDots: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 18,
  },
  balanceDotsTrack: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    position: 'relative',
  },
  balanceDot: {
    backgroundColor: palette.border,
    borderRadius: BALANCE_DOT_SIZE / 2,
    height: BALANCE_DOT_SIZE,
    width: BALANCE_DOT_SIZE,
  },
  balanceDotActive: {
    backgroundColor: palette.olive,
    borderRadius: BALANCE_DOT_SIZE / 2,
    height: BALANCE_DOT_SIZE,
    left: 0,
    position: 'absolute',
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
    alignItems: 'flex-start',
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
  summaryData: {
    flex: 1,
    gap: 9,
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
  transferSummaryDetail: {
    gap: 3,
    overflow: 'hidden',
    zIndex: 1,
  },
  transferSummaryDivider: {
    backgroundColor: palette.border,
    height: StyleSheet.hairlineWidth,
    marginBottom: 4,
    width: '100%',
  },
  transferSummaryLabel: {
    fontSize: 11,
    lineHeight: 15,
  },
  transferSummaryAmount: {
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
    lineHeight: 21,
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    padding: Spacing.three,
    position: 'relative',
  },
  animatedSectionContent: {
    zIndex: 1,
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
  transferIcon: {
    alignItems: 'center',
    backgroundColor: palette.olivePale,
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
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
