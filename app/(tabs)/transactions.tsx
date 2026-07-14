import { useCallback, useRef, useState } from 'react';
import { router, type Href, useFocusEffect } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type TransactionType = 'income' | 'expense';

type Category = {
  name: string;
  color: string | null;
};

type Transaction = {
  id: string;
  amount: number | string;
  type: TransactionType;
  description: string | null;
  transaction_date: string;
  categories: Category | Category[] | null;
};

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  currency: 'MXN',
  style: 'currency',
});

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function getCategoryName(transaction: Transaction) {
  if (Array.isArray(transaction.categories)) {
    return transaction.categories[0]?.name ?? 'Sin categoría';
  }

  return transaction.categories?.name ?? 'Sin categoría';
}

function formatDate(date: string) {
  return dateFormatter.format(new Date(`${date}T00:00:00`));
}

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const lastTapRef = useRef({ id: '', time: 0 });

  const loadTransactions = useCallback(async (showLoading = true) => {
    setErrorMessage('');

    if (showLoading) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setErrorMessage(userError?.message ?? 'No se encontró una sesión activa.');
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('id, amount, type, description, transaction_date, categories(name, color)')
      .eq('user_id', userData.user.id)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    setTransactions((data ?? []) as Transaction[]);
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
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

  function renderTransaction({ item }: { item: Transaction }) {
    const isIncome = item.type === 'income';

    return (
      <Pressable
        accessibilityHint="Toca dos veces para editar este movimiento"
        accessibilityRole="button"
        onPress={() => handleTransactionPress(item.id)}
        style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
        <View style={styles.itemMain}>
          <ThemedText type="smallBold">{item.description || getCategoryName(item)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {getCategoryName(item)} · {formatDate(item.transaction_date)}
          </ThemedText>
        </View>
        <ThemedText
          type="smallBold"
          style={[styles.amount, isIncome ? styles.incomeAmount : styles.expenseAmount]}>
          {isIncome ? '+' : '-'}
          {currencyFormatter.format(Number(item.amount))}
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Movimientos</ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => loadTransactions(false)}
            style={({ pressed }) => [styles.refreshButton, pressed && styles.buttonPressed]}>
            <ThemedText type="smallBold" style={styles.refreshButtonText}>
              Refrescar
            </ThemedText>
          </Pressable>
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
              onPress={() => loadTransactions()}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
              <ThemedText type="smallBold" style={styles.primaryButtonText}>
                Reintentar
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <FlatList
            contentContainerStyle={[
              styles.listContent,
              transactions.length === 0 && styles.emptyListContent,
            ]}
            data={transactions}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View style={styles.stateContainer}>
                <ThemedText type="smallBold">Aún no hay movimientos.</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  Crea tu primer movimiento con el botón +.
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
            onRefresh={() => loadTransactions(false)}
            refreshing={isRefreshing}
            renderItem={renderTransaction}
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
    gap: Spacing.two,
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
    textAlign: 'right',
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
