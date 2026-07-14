import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
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
import { CategoryExpensesChart } from '@/features/reports/components/category-expenses-chart';
import { IncomeExpenseChart } from '@/features/reports/components/income-expense-chart';
import { MonthlyExpensesChart } from '@/features/reports/components/monthly-expenses-chart';
import { buildReportsSummary } from '@/features/reports/report-data';
import { listTransactions } from '@/features/transactions/transactions.api';
import type { TransactionListItem } from '@/features/transactions/types';
import { useTheme } from '@/hooks/use-theme';
import { getErrorMessage } from '@/lib/errors';

export default function ReportsScreen() {
  const theme = useTheme();
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const hasLoadedRef = useRef(false);

  const loadReports = useCallback(async (mode: 'initial' | 'refresh' | 'silent') => {
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
      loadReports(hasLoadedRef.current ? 'silent' : 'initial');
    }, [loadReports]),
  );

  const reports = useMemo(() => buildReportsSummary(transactions), [transactions]);
  const cardColors = {
    backgroundColor: theme.background,
    borderColor: theme.backgroundSelected,
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              onRefresh={() => loadReports('refresh')}
              refreshing={isRefreshing}
              tintColor={theme.text}
            />
          }
          showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.header}>
              <ThemedText type="subtitle">Reportes</ThemedText>
              <ThemedText themeColor="textSecondary">
                Entiende cómo se mueve tu dinero.
              </ThemedText>
            </View>

            {isLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator color={theme.text} />
                <ThemedText type="small" themeColor="textSecondary">
                  Preparando tus gráficas...
                </ThemedText>
              </View>
            ) : errorMessage ? (
              <View style={[styles.stateCard, cardColors]}>
                <ThemedText type="smallBold" style={styles.errorText}>
                  No pudimos cargar tus reportes
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.stateText}>
                  {errorMessage}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => loadReports('initial')}
                  style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}>
                  <ThemedText type="smallBold" style={styles.retryButtonText}>
                    Reintentar
                  </ThemedText>
                </Pressable>
              </View>
            ) : (
              <>
                <IncomeExpenseChart
                  expenses={reports.expenses}
                  income={reports.income}
                  period={reports.currentMonthLabel}
                />
                <MonthlyExpensesChart months={reports.monthlyExpenses} />
                <CategoryExpensesChart
                  categories={reports.categories}
                  period={reports.currentMonthLabel}
                />
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
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    width: '100%',
  },
  header: {
    gap: Spacing.one,
    marginBottom: Spacing.one,
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
    gap: Spacing.three,
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
  retryButton: {
    alignItems: 'center',
    backgroundColor: '#208AEF',
    borderRadius: 9,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: Spacing.three,
  },
  retryButtonText: {
    color: '#FFFFFF',
  },
  buttonPressed: {
    opacity: 0.65,
  },
});
