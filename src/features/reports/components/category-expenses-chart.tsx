import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { CategoryIcon } from '@/features/categories/components/category-icon';
import type { CategoryExpense } from '@/features/reports/report-data';
import { reportDecorations, reportPalette } from '@/features/reports/report-theme';
import { formatCurrency } from '@/features/transactions/formatters';

import { ReportCard } from './report-card';

const maxDisplayedCategories = 3;
const otherCategoriesColor = '#8B919B';

function getSoftCategoryColor(color?: string | null) {
  return color && /^#[0-9A-F]{6}$/i.test(color) ? `${color}22` : reportPalette.oliveSoft;
}

function getDisplayedCategories(categories: CategoryExpense[]) {
  const categoriesWithExpenses = categories.filter((category) => category.amount > 0);

  if (categoriesWithExpenses.length <= maxDisplayedCategories) return categoriesWithExpenses;

  const principalCategories = categoriesWithExpenses.slice(0, maxDisplayedCategories - 1);
  const otherCategories = categoriesWithExpenses.slice(maxDisplayedCategories - 1);

  return [
    ...principalCategories,
    {
      amount: otherCategories.reduce((total, category) => total + category.amount, 0),
      color: otherCategoriesColor,
      icon_key: null,
      name: 'Otras categorías',
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
  const displayedCategories = getDisplayedCategories(categories);

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
                  size={48}
                  symbolSize={23}
                />
                <ThemedText numberOfLines={1} style={styles.categoryName}>
                  {category.name}
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
  categoriesRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
    minHeight: 130,
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
    lineHeight: 20,
    marginTop: 2,
    maxWidth: '100%',
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
