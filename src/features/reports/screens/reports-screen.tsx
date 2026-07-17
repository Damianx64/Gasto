import { useCallback, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
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
import { BottomTabInset, Fonts, Spacing } from '@/constants/theme';
import { CategoryExpensesChart } from '@/features/reports/components/category-expenses-chart';
import { IncomeExpenseChart } from '@/features/reports/components/income-expense-chart';
import { MonthlyExpensesChart } from '@/features/reports/components/monthly-expenses-chart';
import { buildReportsSummary } from '@/features/reports/report-data';
import { reportDecorations, reportPalette } from '@/features/reports/report-theme';
import { listTransactions } from '@/features/transactions/transactions.api';
import type { TransactionListItem } from '@/features/transactions/types';
import { getErrorMessage } from '@/lib/errors';

export default function ReportsScreen() {
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

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              onRefresh={() => loadReports('refresh')}
              refreshing={isRefreshing}
              tintColor={reportPalette.olive}
            />
          }
          showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <ThemedText style={styles.title}>Reportes</ThemedText>
                <Image
                  accessible={false}
                  contentFit="contain"
                  pointerEvents="none"
                  source={reportDecorations.header}
                  style={styles.titleDecoration}
                />
              </View>
              <ThemedText style={styles.subtitle}>
                Gráficas de gastos mensuales.
              </ThemedText>
            </View>

            {isLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator color={reportPalette.olive} />
                <ThemedText type="small" style={styles.stateText}>
                  Preparando tus gráficas...
                </ThemedText>
              </View>
            ) : errorMessage ? (
              <View style={styles.stateCard}>
                <ThemedText type="smallBold" style={styles.errorText}>
                  No pudimos cargar tus reportes
                </ThemedText>
                <ThemedText type="small" style={styles.stateText}>
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
    backgroundColor: reportPalette.background,
    flex: 1,
  },
  safeArea: {
    backgroundColor: reportPalette.background,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: BottomTabInset + Spacing.six,
  },
  content: {
    alignSelf: 'center',
    gap: 16,
    maxWidth: 560,
    paddingHorizontal: Spacing.three,
    paddingTop: 10,
    width: '100%',
  },
  header: {
    gap: 2,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  title: {
    color: reportPalette.ink,
    fontFamily: Fonts.serif,
    fontSize: 42,
    fontWeight: '500',
    letterSpacing: -0.9,
    lineHeight: 49,
  },
  titleDecoration: {
    height: 35,
    opacity: 0.82,
    transform: [{ rotate: '-8deg' }],
    width: 58,
  },
  subtitle: {
    color: reportPalette.muted,
    fontFamily: Fonts.serif,
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 24,
  },
  loadingState: {
    alignItems: 'center',
    gap: Spacing.three,
    justifyContent: 'center',
    minHeight: 360,
  },
  stateCard: {
    alignItems: 'center',
    backgroundColor: reportPalette.surface,
    borderColor: reportPalette.border,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    gap: Spacing.three,
    justifyContent: 'center',
    minHeight: 280,
    padding: Spacing.four,
    shadowColor: '#6D6659',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  errorText: {
    color: reportPalette.expense,
    fontFamily: Fonts.serif,
    fontSize: 16,
  },
  stateText: {
    color: reportPalette.muted,
    fontFamily: Fonts.serif,
    textAlign: 'center',
  },
  retryButton: {
    alignItems: 'center',
    backgroundColor: reportPalette.oliveDark,
    borderRadius: 22,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: Spacing.three,
  },
  retryButtonText: {
    color: reportPalette.white,
    fontFamily: Fonts.serif,
  },
  buttonPressed: {
    opacity: 0.65,
  },
});
