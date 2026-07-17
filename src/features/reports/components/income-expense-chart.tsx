import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { reportDecorations, reportPalette } from '@/features/reports/report-theme';
import { formatCurrency } from '@/features/transactions/formatters';

import { ReportCard } from './report-card';

const chartColors = {
  expense: reportPalette.expense,
  income: '#5E8B62',
};

type ComparisonRowProps = {
  amount: number;
  color: string;
  label: string;
  maxAmount: number;
};

function ComparisonRow({ amount, color, label, maxAmount }: ComparisonRowProps) {
  const width = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;

  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${formatCurrency(amount)}`}
      style={styles.comparisonRow}>
      <View style={styles.rowHeader}>
        <View style={styles.labelRow}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <ThemedText style={styles.label}>{label}</ThemedText>
        </View>
        <ThemedText style={styles.amount}>
          {formatCurrency(amount)}
        </ThemedText>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.bar,
            {
              backgroundColor: color,
              width: `${width}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

export function IncomeExpenseChart({
  expenses,
  income,
  period,
}: {
  expenses: number;
  income: number;
  period: string;
}) {
  const difference = income - expenses;
  const maxAmount = Math.max(income, expenses);
  const hasData = maxAmount > 0;
  const statusColor = difference >= 0 ? chartColors.income : chartColors.expense;
  const status = difference >= 0
    ? `Te quedan ${formatCurrency(difference)}`
    : `Gastaste ${formatCurrency(Math.abs(difference))} más de lo que ingresaste`;

  return (
    <ReportCard description={`Balance de ${period}`} title="Ingresos vs gastos">
      <Image
        accessible={false}
        contentFit="contain"
        pointerEvents="none"
        source={reportDecorations.comparison}
        style={styles.decoration}
      />

      <View
        style={[
          styles.status,
          {
            backgroundColor:
              difference >= 0 ? reportPalette.oliveSoft : reportPalette.expenseSoft,
          },
        ]}>
        <ThemedText style={[styles.statusText, { color: statusColor }]}>
          {hasData ? status : 'Aún no hay movimientos este mes'}
        </ThemedText>
      </View>

      <View style={styles.rows}>
        <ComparisonRow
          amount={income}
          color={chartColors.income}
          label="Ingresos"
          maxAmount={maxAmount}
        />
        <ComparisonRow
          amount={expenses}
          color={chartColors.expense}
          label="Gastos"
          maxAmount={maxAmount}
        />
      </View>
    </ReportCard>
  );
}

const styles = StyleSheet.create({
  decoration: {
    height: 190,
    opacity: 0.72,
    position: 'absolute',
    right: -23,
    top: 14,
    width: 170,
  },
  status: {
    alignSelf: 'flex-start',
    borderRadius: 11,
    maxWidth: '78%',
    paddingHorizontal: 13,
    paddingVertical: 9,
    zIndex: 1,
  },
  statusText: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
  rows: {
    gap: 22,
    paddingTop: 5,
    zIndex: 1,
  },
  comparisonRow: {
    gap: 10,
  },
  rowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  dot: {
    borderRadius: 7,
    height: 14,
    width: 14,
  },
  label: {
    color: reportPalette.ink,
    fontFamily: Fonts.serif,
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 26,
  },
  amount: {
    color: reportPalette.ink,
    fontFamily: Fonts.serif,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
    lineHeight: 26,
  },
  track: {
    backgroundColor: reportPalette.track,
    borderRadius: 8,
    height: 14,
    overflow: 'hidden',
  },
  bar: {
    borderRadius: 8,
    height: '100%',
    minWidth: 0,
  },
});
