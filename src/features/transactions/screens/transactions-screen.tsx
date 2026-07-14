import { useCallback, useMemo, useRef, useState } from 'react';
import { router, type Href, useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  type SectionListData,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getErrorMessage } from '@/lib/errors';

import { formatCurrency, getTransactionCategoryName } from '../formatters';
import { listTransactions } from '../transactions.api';
import type { TransactionListItem } from '../types';

type FilterPeriod = 'today' | 'week' | 'month' | 'year';

type TransactionSection = {
  data: TransactionListItem[];
  title: string;
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
      loadTransactions(hasLoadedRef.current ? 'silent' : 'initial');
    }, [loadTransactions]),
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

  function renderTransaction({ item }: { item: TransactionListItem }) {
    const isIncome = item.type === 'income';

    return (
      <Pressable
        accessibilityHint="Toca dos veces para editar este movimiento"
        accessibilityRole="button"
        onPress={() => handleTransactionPress(item.id)}
        style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
        <View style={styles.itemMain}>
          <ThemedText type="smallBold">
            {item.description || getTransactionCategoryName(item)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {getTransactionCategoryName(item)}
          </ThemedText>
        </View>
        <ThemedText
          type="smallBold"
          style={[styles.amount, isIncome ? styles.incomeAmount : styles.expenseAmount]}>
          {isIncome ? '+' : '-'}
          {formatCurrency(item.amount)}
        </ThemedText>
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
        <ThemedText type="smallBold" style={styles.sectionHeaderText}>
          {section.title}
        </ThemedText>
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Movimientos</ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => loadTransactions('refresh')}
            style={({ pressed }) => [styles.refreshButton, pressed && styles.buttonPressed]}>
            <ThemedText type="smallBold" style={styles.refreshButtonText}>
              Refrescar
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.filterSegment}>
          {filterOptions.map((option) => {
            const isSelected = selectedPeriod === option.value;

            return (
              <Pressable
                accessibilityRole="button"
                key={option.value}
                onPress={() => setSelectedPeriod(option.value)}
                style={({ pressed }) => [
                  styles.filterButton,
                  isSelected && styles.filterButtonActive,
                  pressed && styles.buttonPressed,
                ]}>
                <ThemedText
                  type="smallBold"
                  style={isSelected && styles.filterButtonTextActive}>
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {isLoading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator />
            <ThemedText type="small" themeColor="textSecondary">
              Cargando movimientos...
            </ThemedText>
          </View>
        ) : errorMessage ? (
          <View style={styles.stateContainer}>
            <ThemedText type="smallBold" style={styles.errorText}>
              {errorMessage}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => loadTransactions('initial')}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
              <ThemedText type="smallBold" style={styles.primaryButtonText}>
                Reintentar
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <SectionList
            contentContainerStyle={[
              styles.listContent,
              transactionSections.length === 0 && styles.emptyListContent,
            ]}
            sections={transactionSections}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View style={styles.stateContainer}>
                <ThemedText type="smallBold">
                  {transactions.length === 0
                    ? 'Aún no hay movimientos.'
                    : 'No hay movimientos en este periodo.'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  {transactions.length === 0
                    ? 'Crea tu primer movimiento con el botón +.'
                    : 'Prueba con otro filtro o registra un movimiento nuevo.'}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/transaction/new')}
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
                  <ThemedText type="smallBold" style={styles.primaryButtonText}>
                    Nuevo movimiento
                  </ThemedText>
                </Pressable>
              </View>
            }
            onRefresh={() => loadTransactions('refresh')}
            refreshing={isRefreshing}
            renderItem={renderTransaction}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled={false}
          />
        )}
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
    padding: Spacing.four,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  filterSegment: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    flexDirection: 'row',
    gap: Spacing.one,
    marginBottom: Spacing.three,
    padding: Spacing.one,
  },
  filterButton: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
  },
  filterButtonActive: {
    backgroundColor: '#111827',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  refreshButton: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  refreshButtonText: {
    color: '#ffffff',
  },
  listContent: {
    paddingBottom: Spacing.six,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  item: {
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
    padding: Spacing.three,
  },
  itemPressed: {
    opacity: 0.8,
  },
  itemMain: {
    flex: 1,
    gap: Spacing.one,
  },
  amount: {
    minWidth: 110,
    textAlign: 'right',
  },
  sectionHeader: {
    paddingBottom: Spacing.two,
    paddingTop: Spacing.three,
  },
  sectionHeaderText: {
    color: '#374151',
  },
  incomeAmount: {
    color: '#15803d',
  },
  expenseAmount: {
    color: '#dc2626',
  },
  stateContainer: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.three,
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  buttonPressed: {
    opacity: 0.75,
  },
});
