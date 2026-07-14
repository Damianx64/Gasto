import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatCurrency } from '@/features/transactions/formatters';
import { useTheme } from '@/hooks/use-theme';

import { ReportCard } from './report-card';

const chartColors = {
  expense: '#F0656B',
  income: '#31A778',
};

type ComparisonRowProps = {
  amount: number;
  color: string;
  label: string;
  maxAmount: number;
};

function ComparisonRow({ amount, color, label, maxAmount }: ComparisonRowProps) {
  const theme = useTheme();
  const width = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;

  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${formatCurrency(amount)}`}
      style={styles.comparisonRow}>
      <View style={styles.rowHeader}>
        <View style={styles.labelRow}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <ThemedText type="smallBold">{label}</ThemedText>
        </View>
        <ThemedText type="smallBold" style={styles.amount}>
          {formatCurrency(amount)}
        </ThemedText>
      </View>
      <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
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
    : `Gastaste ${formatCurrency(Math.abs(difference))} más de lo que ingresó`;

  return (
    <ReportCard description={`Balance de ${period}`} title="Ingresos vs gastos">
      <View style={[styles.status, { backgroundColor: `${statusColor}18` }]}>
        <ThemedText type="smallBold" style={{ color: statusColor }}>
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
  status: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rows: {
    gap: Spacing.three,
  },
  comparisonRow: {
    gap: Spacing.two,
  },
  rowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  dot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  amount: {
    fontVariant: ['tabular-nums'],
  },
  track: {
    borderRadius: 6,
    height: 12,
    overflow: 'hidden',
  },
  bar: {
    borderRadius: 6,
    height: '100%',
    minWidth: 0,
  },
});
