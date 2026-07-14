import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { CategoryExpense } from '@/features/reports/report-data';
import { formatCurrency } from '@/features/transactions/formatters';
import { useTheme } from '@/hooks/use-theme';

import { ReportCard } from './report-card';

const chartSize = 164;
const chartCenter = chartSize / 2;
const chartRadius = chartSize / 2 - 5;
const maxLegendItems = 5;
const otherCategoriesColor = '#8B919B';

function getPoint(angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;

  return {
    x: chartCenter + chartRadius * Math.cos(radians),
    y: chartCenter + chartRadius * Math.sin(radians),
  };
}

function getSlicePath(startAngle: number, endAngle: number) {
  const start = getPoint(startAngle);
  const end = getPoint(endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${chartCenter} ${chartCenter}`,
    `L ${start.x} ${start.y}`,
    `A ${chartRadius} ${chartRadius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}

function getDisplayedCategories(categories: CategoryExpense[]) {
  if (categories.length <= maxLegendItems) return categories;

  const principalCategories = categories.slice(0, maxLegendItems - 1);
  const otherCategories = categories.slice(maxLegendItems - 1);
  const amount = otherCategories.reduce((total, category) => total + category.amount, 0);
  const percentage = otherCategories.reduce(
    (total, category) => total + category.percentage,
    0,
  );

  return [
    ...principalCategories,
    {
      amount,
      color: otherCategoriesColor,
      name: 'Otras categorías',
      percentage,
    },
  ];
}

export function CategoryExpensesChart({
  categories,
  period,
}: {
  categories: CategoryExpense[];
  period: string;
}) {
  const theme = useTheme();
  const displayedCategories = getDisplayedCategories(
    categories.filter((category) => category.amount > 0),
  );
  const total = displayedCategories.reduce((sum, category) => sum + category.amount, 0);
  let currentAngle = 0;

  return (
    <ReportCard description={`Distribución de ${period}`} title="Gastos por categoría">
      {displayedCategories.length ? (
        <View style={styles.chartLayout}>
          <View
            accessible
            accessibilityLabel={`Gráfica de pastel de gastos por categoría. Total: ${formatCurrency(total)}`}
            style={styles.pieContainer}>
            <Svg height={chartSize} viewBox={`0 0 ${chartSize} ${chartSize}`} width={chartSize}>
              {displayedCategories.length === 1 ? (
                <Circle
                  cx={chartCenter}
                  cy={chartCenter}
                  fill={displayedCategories[0].color}
                  r={chartRadius}
                />
              ) : (
                displayedCategories.map((category) => {
                  const startAngle = currentAngle;
                  const endAngle = startAngle + (category.amount / total) * 360;
                  currentAngle = endAngle;

                  return (
                    <Path
                      d={getSlicePath(startAngle, endAngle)}
                      fill={category.color}
                      key={category.name}
                      stroke={theme.background}
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  );
                })
              )}
            </Svg>
          </View>

          <View style={styles.legend}>
            {displayedCategories.map((category) => (
              <View
                accessible
                accessibilityLabel={`${category.name}: ${formatCurrency(category.amount)}, ${category.percentage.toFixed(0)} por ciento`}
                key={category.name}
                style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: category.color }]} />
                <View style={styles.legendText}>
                  <View style={styles.legendHeader}>
                    <ThemedText type="smallBold" numberOfLines={1} style={styles.categoryName}>
                      {category.name}
                    </ThemedText>
                    <ThemedText type="smallBold" style={styles.percentage}>
                      {category.percentage.toFixed(0)}%
                    </ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.amount}>
                    {formatCurrency(category.amount)}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={[styles.empty, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
            Tus categorías aparecerán aquí cuando registres un gasto este mes.
          </ThemedText>
        </View>
      )}
    </ReportCard>
  );
}

const styles = StyleSheet.create({
  chartLayout: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.four,
    justifyContent: 'center',
  },
  pieContainer: {
    height: chartSize,
    width: chartSize,
  },
  legend: {
    flex: 1,
    gap: 10,
    minWidth: 150,
  },
  legendItem: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  dot: {
    borderRadius: 5,
    height: 10,
    marginTop: 5,
    width: 10,
  },
  legendText: {
    flex: 1,
    minWidth: 0,
  },
  legendHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  categoryName: {
    flex: 1,
  },
  percentage: {
    fontVariant: ['tabular-nums'],
  },
  amount: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  empty: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 164,
    padding: Spacing.four,
  },
  emptyText: {
    textAlign: 'center',
  },
});
