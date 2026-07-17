import { useCallback, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { router, type Href, useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  type SectionListData,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Fonts, Spacing } from '@/constants/theme';
import { CategoryIcon } from '@/features/categories/components/category-icon';
import { useSync } from '@/features/offline/sync-context';
import { getErrorMessage } from '@/lib/errors';

import {
  formatCurrency,
  getTransactionCategory,
  getTransactionCategoryName,
} from '../formatters';
import { listTransactions } from '../transactions.api';
import type { TransactionListItem } from '../types';

type FilterPeriod = 'today' | 'week' | 'month' | 'year';

type TransactionSection = {
  data: TransactionListItem[];
  title: string;
};

const palette = {
  background: '#FBF8F1',
  border: '#E4DAC9',
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
  flowersPrimary: require('../../../../assets/decorations/flores_vertical_2.webp'),
  flowersSecondary: require('../../../../assets/decorations/flores_vertical_3.webp'),
  leaves: require('../../../../assets/decorations/hojas_horizontal_1.webp'),
  stem: require('../../../../assets/decorations/planta_vertical_1.webp'),
};

const filterOptions: { label: string; value: FilterPeriod }[] = [
  { label: 'Hoy', value: 'today' },
  { label: 'Semana', value: 'week' },
  { label: 'Mes', value: 'month' },
  { label: 'Año', value: 'year' },
];

const dayHeaderFormatter = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'long',
});

function TransactionsText({ style, themeColor, ...props }: ThemedTextProps) {
  return (
    <ThemedText
      {...props}
      style={[
        styles.transactionsText,
        themeColor === 'textSecondary' && styles.secondaryText,
        style,
      ]}
    />
  );
}

function getSoftCategoryColor(color?: string | null) {
  return color && /^#[0-9A-F]{6}$/i.test(color) ? `${color}22` : palette.olivePale;
}

function parseTransactionDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getPeriodRange(period: FilterPeriod) {
  const today = getStartOfDay(new Date());

  if (period === 'today') {
    return {
      end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
      start: today,
    };
  }

  if (period === 'week') {
    const mondayOffset = (today.getDay() + 6) % 7;
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset);

    return {
      end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7),
      start,
    };
  }

  if (period === 'year') {
    return {
      end: new Date(today.getFullYear() + 1, 0, 1),
      start: new Date(today.getFullYear(), 0, 1),
    };
  }

  return {
    end: new Date(today.getFullYear(), today.getMonth() + 1, 1),
    start: new Date(today.getFullYear(), today.getMonth(), 1),
  };
}

function isTransactionInPeriod(transaction: TransactionListItem, period: FilterPeriod) {
  const transactionDate = parseTransactionDate(transaction.transaction_date);
  const { end, start } = getPeriodRange(period);

  return transactionDate >= start && transactionDate < end;
}

function groupTransactionsByDay(transactions: TransactionListItem[]) {
  return transactions.reduce<TransactionSection[]>((sections, transaction) => {
    const title = dayHeaderFormatter.format(parseTransactionDate(transaction.transaction_date));
    const lastSection = sections[sections.length - 1];

    if (lastSection?.title === title) {
      lastSection.data.push(transaction);
    } else {
      sections.push({ data: [transaction], title });
    }

    return sections;
  }, []);
}

export default function TransactionsScreen() {
  const { revision, syncNow } = useSync();
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<FilterPeriod>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const hasLoadedRef = useRef(false);
  const lastTapRef = useRef({ id: '', time: 0 });

  const filteredTransactions = useMemo(
    () => transactions.filter((transaction) => isTransactionInPeriod(transaction, selectedPeriod)),
    [selectedPeriod, transactions],
  );

  const transactionSections = useMemo(
    () => groupTransactionsByDay(filteredTransactions),
    [filteredTransactions],
  );

  const loadTransactions = useCallback(async (mode: 'initial' | 'refresh' | 'silent') => {
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
      loadTransactions(hasLoadedRef.current ? 'silent' : 'initial');
    }, [loadTransactions, revision]),
  );

  function handleTransactionPress(transactionId: string) {
    const now = Date.now();
    const isDoubleTap =
      lastTapRef.current.id === transactionId && now - lastTapRef.current.time < 350;

    lastTapRef.current = { id: transactionId, time: now };

    if (isDoubleTap) {
      router.push({ pathname: '/transaction/[id]', params: { id: transactionId } } as Href);
    }
  }

  function renderTransaction({ item, index }: { item: TransactionListItem; index: number }) {
    const isIncome = item.type === 'income';
    const category = getTransactionCategory(item);
    const categoryColor = category?.color || palette.olive;

    return (
      <Pressable
        accessibilityHint="Toca dos veces para editar este movimiento"
        accessibilityRole="button"
        onPress={() => handleTransactionPress(item.id)}
        style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
        <Image
          accessible={false}
          contentFit="contain"
          pointerEvents="none"
          source={index % 2 === 0 ? decorations.flowersPrimary : decorations.flowersSecondary}
          style={styles.itemDecoration}
        />

        <View style={styles.iconCluster}>
          <CategoryIcon
            backgroundColor={getSoftCategoryColor(categoryColor)}
            iconColor={categoryColor}
            iconKey={category?.icon_key}
            size={54}
            symbolSize={26}
          />
          <Image
            accessible={false}
            contentFit="contain"
            pointerEvents="none"
            source={decorations.leaves}
            style={styles.iconDecoration}
          />
        </View>

        <View style={styles.itemMain}>
          <TransactionsText numberOfLines={1} style={styles.itemTitle}>
            {item.description || getTransactionCategoryName(item)}
          </TransactionsText>
          <TransactionsText
            numberOfLines={1}
            themeColor="textSecondary"
            style={styles.itemSubtitle}>
            {getTransactionCategoryName(item)}
          </TransactionsText>
        </View>

        <TransactionsText
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          numberOfLines={1}
          style={[
            styles.amount,
            isIncome ? styles.incomeAmount : styles.expenseAmount,
          ]}>
          {isIncome ? '+' : '-'}
          {formatCurrency(item.amount)}
        </TransactionsText>
      </Pressable>
    );
  }

  function renderSectionHeader({
    section,
  }: {
    section: SectionListData<TransactionListItem, TransactionSection>;
  }) {
    return (
      <View style={styles.sectionHeader}>
        <TransactionsText style={styles.sectionHeaderText}>{section.title}</TransactionsText>
        <Image
          accessible={false}
          contentFit="contain"
          pointerEvents="none"
          source={decorations.stem}
          style={styles.sectionDecoration}
        />
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleCluster}>
              <TransactionsText adjustsFontSizeToFit numberOfLines={1} style={styles.title}>
                Movimientos
              </TransactionsText>
              <Image
                accessible={false}
                contentFit="contain"
                pointerEvents="none"
                source={decorations.leaves}
                style={styles.titleDecoration}
              />
            </View>

            <Pressable
              accessibilityLabel="Refrescar movimientos"
              accessibilityRole="button"
              accessibilityState={{ busy: isRefreshing, disabled: isRefreshing }}
              disabled={isRefreshing}
              onPress={() => loadTransactions('refresh')}
              style={({ pressed }) => [
                styles.refreshButton,
                pressed && styles.buttonPressed,
              ]}>
              <TransactionsText type="smallBold" style={styles.refreshButtonText}>
                Refrescar
              </TransactionsText>
              {isRefreshing ? (
                <ActivityIndicator color={palette.white} size="small" />
              ) : (
                <SymbolView
                  name={{ android: 'refresh', ios: 'arrow.clockwise', web: 'refresh' }}
                  size={19}
                  tintColor={palette.white}
                />
              )}
            </Pressable>
          </View>

          <View style={styles.filterSegment}>
            {filterOptions.map((option) => {
              const isSelected = selectedPeriod === option.value;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={option.value}
                  onPress={() => setSelectedPeriod(option.value)}
                  style={({ pressed }) => [
                    styles.filterButton,
                    isSelected && styles.filterButtonActive,
                    pressed && styles.buttonPressed,
                  ]}>
                  <TransactionsText
                    numberOfLines={1}
                    style={[
                      styles.filterButtonText,
                      isSelected && styles.filterButtonTextActive,
                    ]}>
                    {option.label}
                  </TransactionsText>
                </Pressable>
              );
            })}
          </View>

          {isLoading ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator color={palette.olive} />
              <TransactionsText type="small" themeColor="textSecondary">
                Preparando tus movimientos...
              </TransactionsText>
            </View>
          ) : errorMessage ? (
            <View style={styles.stateCard}>
              <TransactionsText style={styles.stateTitle}>
                No pudimos cargar tus movimientos
              </TransactionsText>
              <TransactionsText
                type="small"
                themeColor="textSecondary"
                style={styles.stateText}>
                {errorMessage}
              </TransactionsText>
              <Pressable
                accessibilityRole="button"
                onPress={() => loadTransactions('initial')}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
                <TransactionsText type="smallBold" style={styles.primaryButtonText}>
                  Reintentar
                </TransactionsText>
              </Pressable>
            </View>
          ) : (
            <SectionList
              contentContainerStyle={[
                styles.listContent,
                transactionSections.length === 0 && styles.emptyListContent,
              ]}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Image
                    accessible={false}
                    contentFit="contain"
                    pointerEvents="none"
                    source={decorations.flowersPrimary}
                    style={styles.emptyDecoration}
                  />
                  <TransactionsText style={styles.stateTitle}>
                    {transactions.length === 0
                      ? 'Aún no hay movimientos'
                      : 'No hay movimientos en este periodo'}
                  </TransactionsText>
                  <TransactionsText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.stateText}>
                    {transactions.length === 0
                      ? 'Crea tu primer movimiento con el botón +.'
                      : 'Prueba con otro filtro o registra un movimiento nuevo.'}
                  </TransactionsText>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push('/transaction/new')}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && styles.buttonPressed,
                    ]}>
                    <TransactionsText type="smallBold" style={styles.primaryButtonText}>
                      Nuevo movimiento
                    </TransactionsText>
                  </Pressable>
                </View>
              }
              refreshControl={
                <RefreshControl
                  colors={[palette.olive]}
                  onRefresh={() => loadTransactions('refresh')}
                  refreshing={isRefreshing}
                  tintColor={palette.olive}
                />
              }
              renderItem={renderTransaction}
              renderSectionHeader={renderSectionHeader}
              sections={transactionSections}
              showsVerticalScrollIndicator={false}
              stickySectionHeadersEnabled={false}
              style={styles.list}
            />
          )}
        </View>
      </SafeAreaView>
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
  content: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: 560,
    paddingHorizontal: Spacing.three,
    paddingTop: 10,
    width: '100%',
  },
  transactionsText: {
    color: palette.ink,
    fontFamily: Fonts.serif,
  },
  secondaryText: {
    color: palette.muted,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
    minHeight: 64,
  },
  titleCluster: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
  },
  title: {
    flexShrink: 1,
    fontSize: 36,
    fontWeight: '500',
    letterSpacing: -0.7,
    lineHeight: 43,
  },
  titleDecoration: {
    height: 30,
    marginLeft: 6,
    marginTop: 6,
    opacity: 0.85,
    transform: [{ rotate: '-8deg' }],
    width: 35,
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: palette.olive,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 15,
  },
  refreshButtonText: {
    color: palette.white,
    fontSize: 15,
    fontWeight: '500',
  },
  filterSegment: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 15,
    padding: 4,
  },
  filterButton: {
    alignItems: 'center',
    borderRadius: 15,
    flex: 1,
    justifyContent: 'center',
    minHeight: 43,
    paddingHorizontal: 4,
  },
  filterButtonActive: {
    backgroundColor: '#8C9676',
    elevation: 1,
    shadowColor: '#4D503E',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  filterButtonText: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 21,
  },
  filterButtonTextActive: {
    color: palette.white,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: BottomTabInset + Spacing.six,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  sectionHeader: {
    justifyContent: 'center',
    minHeight: 61,
    paddingBottom: 10,
    paddingTop: 13,
    position: 'relative',
  },
  sectionHeaderText: {
    fontSize: 21,
    fontWeight: '500',
    lineHeight: 27,
    zIndex: 1,
  },
  sectionDecoration: {
    height: 62,
    opacity: 0.62,
    position: 'absolute',
    right: 3,
    top: 0,
    transform: [{ rotate: '7deg' }],
    width: 28,
  },
  item: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    marginBottom: 10,
    minHeight: 88,
    overflow: 'hidden',
    paddingHorizontal: 13,
    paddingVertical: 12,
    position: 'relative',
  },
  itemPressed: {
    opacity: 0.67,
    transform: [{ scale: 0.995 }],
  },
  itemDecoration: {
    bottom: -14,
    height: 79,
    opacity: 0.64,
    position: 'absolute',
    right: -8,
    width: 37,
  },
  iconCluster: {
    height: 58,
    justifyContent: 'center',
    position: 'relative',
    width: 65,
    zIndex: 1,
  },
  iconDecoration: {
    bottom: 0,
    height: 26,
    opacity: 0.83,
    position: 'absolute',
    right: -2,
    transform: [{ rotate: '-5deg' }],
    width: 31,
    zIndex: 2,
  },
  itemMain: {
    flex: 1,
    minWidth: 0,
    zIndex: 1,
  },
  itemTitle: {
    fontSize: 19,
    fontWeight: '500',
    lineHeight: 25,
  },
  itemSubtitle: {
    fontSize: 15,
    lineHeight: 21,
  },
  amount: {
    fontSize: 18,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
    lineHeight: 24,
    maxWidth: 125,
    paddingRight: 13,
    textAlign: 'right',
    zIndex: 1,
  },
  incomeAmount: {
    color: palette.oliveDark,
  },
  expenseAmount: {
    color: palette.terracotta,
  },
  stateContainer: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.three,
    justifyContent: 'center',
  },
  stateCard: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    justifyContent: 'center',
    marginTop: Spacing.three,
    minHeight: 280,
    padding: Spacing.four,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    minHeight: 320,
    overflow: 'hidden',
    padding: Spacing.four,
    position: 'relative',
  },
  emptyDecoration: {
    height: 142,
    opacity: 0.25,
    position: 'absolute',
    right: -2,
    top: 48,
    width: 58,
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 27,
    textAlign: 'center',
  },
  stateText: {
    maxWidth: 310,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: palette.oliveDark,
    borderRadius: 22,
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 42,
    paddingHorizontal: Spacing.three,
  },
  primaryButtonText: {
    color: palette.white,
    fontWeight: '500',
  },
  buttonPressed: {
    opacity: 0.68,
  },
});
