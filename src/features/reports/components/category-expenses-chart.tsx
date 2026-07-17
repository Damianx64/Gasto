import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { CategoryIcon } from '@/features/categories/components/category-icon';
import type { CategoryExpense } from '@/features/reports/report-data';
import { reportDecorations, reportPalette } from '@/features/reports/report-theme';
import { formatCurrency } from '@/features/transactions/formatters';

import { ReportCard } from './report-card';

const maxPrincipalCategories = 3;
const otherCategoriesColor = '#8B919B';
const otherCategoriesName = 'Otras categorías';
const chartSize = 146;
const chartCenter = chartSize / 2;
const chartRadius = chartCenter - 5;

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

function getSoftCategoryColor(color?: string | null) {
  return color && /^#[0-9A-F]{6}$/i.test(color) ? `${color}22` : reportPalette.oliveSoft;
}

function getDisplayedCategories(categories: CategoryExpense[]) {
  const categoriesWithExpenses = categories.filter((category) => category.amount > 0);

  if (categoriesWithExpenses.length <= maxPrincipalCategories) return categoriesWithExpenses;

  const principalCategories = categoriesWithExpenses.slice(0, maxPrincipalCategories);
  const otherCategories = categoriesWithExpenses.slice(maxPrincipalCategories);

  return [
    ...principalCategories,
    {
      amount: otherCategories.reduce((total, category) => total + category.amount, 0),
      color: otherCategoriesColor,
      icon_key: null,
      name: otherCategoriesName,
      percentage: otherCategories.reduce(
        (total, category) => total + category.percentage,
        0,
      ),
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
  const pieCategories = categories.filter((category) => category.amount > 0);
  const displayedCategories = getDisplayedCategories(categories);
  const total = pieCategories.reduce((sum, category) => sum + category.amount, 0);
  const hasOtherCategories = displayedCategories.length > maxPrincipalCategories;
  let currentAngle = 0;

  return (
    <ReportCard description={`Distribución de ${period}`} title="Gastos por categoría">
      <Image
        accessible={false}
        contentFit="contain"
        pointerEvents="none"
        source={reportDecorations.categories}
        style={styles.decoration}
      />

      {displayedCategories.length ? (
        <>
          <View style={styles.pieOverview}>
            <View
              accessible
              accessibilityLabel={`Gráfica de pastel de gastos por categoría. Total: ${formatCurrency(total)}`}
              style={styles.pieContainer}>
              <Svg height={chartSize} viewBox={`0 0 ${chartSize} ${chartSize}`} width={chartSize}>
                <Circle
                  cx={chartCenter}
                  cy={chartCenter}
                  fill={reportPalette.cream}
                  r={chartRadius}
                />
                {pieCategories.length === 1 ? (
                  <Circle
                    cx={chartCenter}
                    cy={chartCenter}
                    fill={pieCategories[0].color}
                    r={chartRadius}
                    stroke={reportPalette.surface}
                    strokeWidth={3}
                  />
                ) : (
                  pieCategories.map((category) => {
                    const startAngle = currentAngle;
                    const endAngle = startAngle + (category.amount / total) * 360;
                    currentAngle = endAngle;

                    return (
                      <Path
                        d={getSlicePath(startAngle, endAngle)}
                        fill={category.color}
                        key={category.name}
                        stroke={reportPalette.surface}
                        strokeLinejoin="round"
                        strokeWidth={3}
                      />
                    );
                  })
                )}
              </Svg>
            </View>

            <View style={styles.totalSummary}>
              <ThemedText style={styles.totalLabel}>Gasto total</ThemedText>
              <ThemedText
                adjustsFontSizeToFit
                minimumFontScale={0.78}
                numberOfLines={1}
                style={styles.totalAmount}>
                {formatCurrency(total)}
              </ThemedText>
              <ThemedText style={styles.totalCaption}>
                Distribuido entre {pieCategories.length}{' '}
                {pieCategories.length === 1 ? 'categoría' : 'categorías'}
              </ThemedText>
            </View>
          </View>

          <View style={styles.categoriesRow}>
            {displayedCategories.map((category, index) => (
              <View key={category.name} style={styles.categoryCell}>
                {index > 0 ? <View pointerEvents="none" style={styles.divider} /> : null}
                <View
                  accessible
                  accessibilityLabel={`${category.name}: ${formatCurrency(category.amount)}, ${category.percentage.toFixed(0)} por ciento`}
                  style={styles.categoryItem}>
                  <CategoryIcon
                    backgroundColor={getSoftCategoryColor(category.color)}
                    iconColor={category.color}
                    iconKey={category.icon_key}
                    size={hasOtherCategories ? 40 : 46}
                    symbolSize={hasOtherCategories ? 20 : 22}
                  />
                  <ThemedText
                    adjustsFontSizeToFit={category.name !== otherCategoriesName}
                    minimumFontScale={0.72}
                    numberOfLines={category.name === otherCategoriesName ? 2 : 1}
                    style={[
                      styles.categoryName,
                      category.name === otherCategoriesName && styles.otherCategoryName,
                    ]}>
                    {category.name === otherCategoriesName ? `Otras\ncategorías` : category.name}
                  </ThemedText>
                  <ThemedText
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                    numberOfLines={1}
                    style={[styles.amount, { color: category.color }]}>
                    {formatCurrency(category.amount)}
                  </ThemedText>
                  <ThemedText style={styles.percentage}>
                    {category.percentage.toFixed(0)}%
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.empty}>
          <ThemedText type="small" style={styles.emptyText}>
            Tus categorías aparecerán aquí cuando registres un gasto este mes.
          </ThemedText>
        </View>
      )}
    </ReportCard>
  );
}

const styles = StyleSheet.create({
  decoration: {
    height: 78,
    opacity: 0.62,
    position: 'absolute',
    right: -4,
    top: 1,
    transform: [{ rotate: '13deg' }],
    width: 82,
  },
  pieOverview: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 18,
    justifyContent: 'center',
    zIndex: 1,
  },
  pieContainer: {
    backgroundColor: reportPalette.cream,
    borderColor: reportPalette.border,
    borderRadius: (chartSize + 12) / 2,
    borderWidth: 1,
    elevation: 2,
    height: chartSize + 12,
    padding: 5,
    shadowColor: '#6D6659',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.11,
    shadowRadius: 6,
    width: chartSize + 12,
  },
  totalSummary: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  totalLabel: {
    color: reportPalette.muted,
    fontFamily: Fonts.serif,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  totalAmount: {
    color: reportPalette.ink,
    fontFamily: Fonts.serif,
    fontSize: 23,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
    letterSpacing: -0.3,
    lineHeight: 29,
  },
  totalCaption: {
    color: reportPalette.olive,
    fontFamily: Fonts.serif,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  categoriesRow: {
    alignItems: 'stretch',
    borderTopColor: reportPalette.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 130,
    paddingTop: 14,
    zIndex: 1,
  },
  categoryCell: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
  },
  divider: {
    backgroundColor: reportPalette.border,
    bottom: 2,
    left: 0,
    position: 'absolute',
    top: 2,
    width: StyleSheet.hairlineWidth,
  },
  categoryItem: {
    alignItems: 'center',
    flex: 1,
    gap: 3,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 6,
  },
  categoryName: {
    color: reportPalette.ink,
    fontFamily: Fonts.serif,
    fontSize: 15,
    fontWeight: '500',
    height: 40,
    lineHeight: 20,
    marginTop: 2,
    maxWidth: '100%',
    textAlign: 'center',
    textAlignVertical: 'center',
    width: '100%',
  },
  otherCategoryName: {
    fontSize: 12,
    lineHeight: 18,
  },
  amount: {
    fontFamily: Fonts.serif,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
    lineHeight: 22,
    maxWidth: '100%',
  },
  percentage: {
    color: reportPalette.oliveDark,
    fontFamily: Fonts.serif,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
    lineHeight: 19,
  },
  empty: {
    alignItems: 'center',
    backgroundColor: reportPalette.cream,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 130,
    padding: Spacing.four,
  },
  emptyText: {
    color: reportPalette.muted,
    fontFamily: Fonts.serif,
    textAlign: 'center',
  },
});
