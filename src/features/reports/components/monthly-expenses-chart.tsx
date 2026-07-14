import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { MonthlyExpense } from '@/features/reports/report-data';
import { formatCurrency } from '@/features/transactions/formatters';
import { useTheme } from '@/hooks/use-theme';

import { ReportCard } from './report-card';

const barColor = '#5B8DEF';
const chartHeight = 156;

export function MonthlyExpensesChart({ months }: { months: MonthlyExpense[] }) {
  const theme = useTheme();
  const maxAmount = Math.max(...months.map((month) => month.amount), 0);
  const latestMonth = months.at(-1);

  return (
    <ReportCard
      description="Compara tus últimos 6 meses"
      title="Gastos por mes"
      trailing={
        latestMonth ? (
          <View style={styles.latestAmount}>
            <ThemedText type="small" themeColor="textSecondary">
              Este mes
            </ThemedText>
            <ThemedText type="smallBold" style={styles.amount}>
              {formatCurrency(latestMonth.amount)}
            </ThemedText>
          </View>
        ) : null
      }>
      {maxAmount > 0 ? (
        <View style={styles.chart}>
          {months.map((month, index) => {
            const height = Math.max((month.amount / maxAmount) * 100, month.amount > 0 ? 4 : 0);
            const isCurrentMonth = index === months.length - 1;

            return (
              <View
                accessible
                accessibilityLabel={`${month.label}: ${formatCurrency(month.amount)}`}
                key={month.key}
                style={styles.column}>
                <View style={styles.barArea}>
                  <ThemedText
                    adjustsFontSizeToFit
                    minimumFontScale={0.65}
                    numberOfLines={1}
                    style={[
                      styles.barValue,
                      {
                        bottom: Math.round((height / 100) * chartHeight) + 4,
                        color: isCurrentMonth ? barColor : theme.textSecondary,
                      },
                    ]}
                    type={isCurrentMonth ? 'smallBold' : 'small'}>
                    {formatCurrency(month.amount)}
                  </ThemedText>
                  <View
                    style={[
                      styles.bar,
                      {
                        backgroundColor: isCurrentMonth ? barColor : `${barColor}72`,
                        height: `${height}%`,
                      },
                    ]}
                  />
                </View>
                <ThemedText
                  type={isCurrentMonth ? 'smallBold' : 'small'}
                  themeColor={isCurrentMonth ? undefined : 'textSecondary'}
                  style={styles.monthLabel}>
                  {month.label}
                </ThemedText>
              </View>
            );
          })}
          <View
            pointerEvents="none"
            style={[styles.baseline, { backgroundColor: theme.backgroundSelected }]}
          />
        </View>
      ) : (
        <View style={[styles.emptyChart, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
            Registra gastos para empezar a comparar tus meses.
          </ThemedText>
        </View>
      )}
    </ReportCard>
  );
}

const styles = StyleSheet.create({
  latestAmount: {
    alignItems: 'flex-end',
  },
  amount: {
    fontVariant: ['tabular-nums'],
  },
  chart: {
    flexDirection: 'row',
    gap: Spacing.two,
    position: 'relative',
  },
  column: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.two,
    minWidth: 0,
  },
  barArea: {
    height: chartHeight + 24,
    position: 'relative',
    width: '100%',
  },
  barValue: {
    fontSize: 10,
    left: -6,
    lineHeight: 14,
    position: 'absolute',
    right: -6,
    textAlign: 'center',
  },
  bar: {
    bottom: 0,
    borderRadius: 7,
    minHeight: 0,
    position: 'absolute',
    width: '100%',
  },
  monthLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  baseline: {
    bottom: 27,
    height: StyleSheet.hairlineWidth,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  emptyChart: {
    alignItems: 'center',
    borderRadius: 12,
    height: chartHeight,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  emptyText: {
    textAlign: 'center',
  },
});
