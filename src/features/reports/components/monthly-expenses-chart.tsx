import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import type { MonthlyExpense } from '@/features/reports/report-data';
import { reportDecorations, reportPalette } from '@/features/reports/report-theme';
import { formatCurrency } from '@/features/transactions/formatters';

import { ReportCard } from './report-card';

const chartHeight = 168;

export function MonthlyExpensesChart({ months }: { months: MonthlyExpense[] }) {
  const maxAmount = Math.max(...months.map((month) => month.amount), 0);
  const latestMonth = months.at(-1);

  return (
    <ReportCard
      description="Compara tus últimos 6 meses"
      title="Gastos por mes"
      trailing={
        latestMonth ? (
          <View style={styles.latestAmount}>
            <ThemedText style={styles.latestLabel}>
              Este mes
            </ThemedText>
            <ThemedText style={styles.amount}>
              {formatCurrency(latestMonth.amount)}
            </ThemedText>
          </View>
        ) : null
      }>
      <Image
        accessible={false}
        contentFit="contain"
        pointerEvents="none"
        source={reportDecorations.monthly}
        style={styles.decoration}
      />

      {maxAmount > 0 ? (
        <View style={styles.chart}>
          {months.map((month, index) => {
            const barHeight = month.amount > 0
              ? Math.max((month.amount / maxAmount) * chartHeight, 7)
              : 0;
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
                        bottom: Math.round(barHeight) + 4,
                      },
                    ]}
                    type={isCurrentMonth ? 'smallBold' : 'small'}>
                    {formatCurrency(month.amount)}
                  </ThemedText>
                  <View
                    style={[
                      styles.bar,
                      {
                        backgroundColor: isCurrentMonth ? reportPalette.blue : '#9CA995',
                        height: barHeight,
                      },
                    ]}
                  />
                </View>
                <ThemedText
                  style={[styles.monthLabel, isCurrentMonth && styles.currentMonthLabel]}>
                  {month.label}
                </ThemedText>
              </View>
            );
          })}
          <View
            pointerEvents="none"
            style={styles.baseline}
          />
        </View>
      ) : (
        <View style={styles.emptyChart}>
          <ThemedText type="small" style={styles.emptyText}>
            Registra gastos para empezar a comparar tus meses.
          </ThemedText>
        </View>
      )}
    </ReportCard>
  );
}

const styles = StyleSheet.create({
  decoration: {
    height: 90,
    opacity: 0.65,
    position: 'absolute',
    right: -3,
    top: 47,
    transform: [{ rotate: '12deg' }],
    width: 38,
  },
  latestAmount: {
    alignItems: 'flex-end',
    paddingRight: 5,
    zIndex: 2,
  },
  latestLabel: {
    color: reportPalette.ink,
    fontFamily: Fonts.serif,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 20,
  },
  amount: {
    color: reportPalette.expense,
    fontFamily: Fonts.serif,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
    lineHeight: 25,
  },
  chart: {
    flexDirection: 'row',
    gap: 6,
    position: 'relative',
    zIndex: 1,
  },
  column: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  barArea: {
    height: chartHeight + 24,
    position: 'relative',
    width: '100%',
  },
  barValue: {
    color: reportPalette.ink,
    fontFamily: Fonts.serif,
    fontSize: 10,
    fontWeight: '400',
    left: -6,
    lineHeight: 14,
    position: 'absolute',
    right: -6,
    textAlign: 'center',
  },
  bar: {
    alignSelf: 'center',
    bottom: 0,
    borderRadius: 7,
    maxWidth: 44,
    minHeight: 0,
    position: 'absolute',
    width: '82%',
  },
  monthLabel: {
    color: reportPalette.muted,
    fontFamily: Fonts.serif,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    textAlign: 'center',
  },
  currentMonthLabel: {
    color: reportPalette.ink,
    fontWeight: '700',
  },
  baseline: {
    backgroundColor: reportPalette.border,
    height: StyleSheet.hairlineWidth,
    left: 0,
    position: 'absolute',
    right: 0,
    top: chartHeight + 25,
  },
  emptyChart: {
    alignItems: 'center',
    backgroundColor: reportPalette.cream,
    borderRadius: 12,
    height: chartHeight,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  emptyText: {
    color: reportPalette.muted,
    fontFamily: Fonts.serif,
    textAlign: 'center',
  },
});
