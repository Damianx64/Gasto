import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { CategoryIcon } from '@/features/categories/components/category-icon';
import type { CategoryExpense } from '@/features/reports/report-data';
import { reportDecorations, reportPalette } from '@/features/reports/report-theme';
import { formatCurrency } from '@/features/transactions/formatters';

import { ReportCard } from './report-card';

function getSoftCategoryColor(color?: string | null) {
  return color && /^#[0-9A-F]{6}$/i.test(color) ? `${color}22` : reportPalette.oliveSoft;
}

export function CategoryExpensesList({
  categories,
  period,
}: {
  categories: CategoryExpense[];
  period: string;
}) {
  const categoriesWithExpenses = categories
    .filter((category) => category.amount > 0)
    .sort((left, right) => right.amount - left.amount);
  const largestAmount = categoriesWithExpenses[0]?.amount ?? 0;

  return (
    <ReportCard
      description={`Detalle de ${period}`}
      title="Todas las categorías">
      <Image
        accessible={false}
        contentFit="contain"
        pointerEvents="none"
        source={reportDecorations.categoryList}
        style={styles.decoration}
      />

      {categoriesWithExpenses.length ? (
        <View style={styles.list}>
          {categoriesWithExpenses.map((category, index) => (
            <View
              accessible
              accessibilityLabel={`${index + 1}. ${category.name}: ${formatCurrency(category.amount)}, ${category.percentage.toFixed(0)} por ciento`}
              key={category.name}
              style={[styles.row, index > 0 && styles.rowBorder]}>
              <ThemedText style={styles.position}>{index + 1}</ThemedText>
              <CategoryIcon
                backgroundColor={getSoftCategoryColor(category.color)}
                iconColor={category.color}
                iconKey={category.icon_key}
                size={42}
                symbolSize={20}
              />

              <View style={styles.categoryDetails}>
                <View style={styles.rowHeader}>
                  <ThemedText numberOfLines={1} style={styles.categoryName}>
                    {category.name}
                  </ThemedText>
                  <ThemedText
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                    numberOfLines={1}
                    style={styles.amount}>
                    {formatCurrency(category.amount)}
                  </ThemedText>
                </View>

                <View style={styles.rowFooter}>
                  <View style={styles.track}>
                    <View
                      style={[
                        styles.bar,
                        {
                          backgroundColor: category.color,
                          width: `${largestAmount > 0 ? (category.amount / largestAmount) * 100 : 0}%`,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText style={styles.percentage}>
                    {category.percentage.toFixed(0)}%
                  </ThemedText>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.empty}>
          <ThemedText type="small" style={styles.emptyText}>
            Tus categorías aparecerán aquí cuando registres un gasto en {period}.
          </ThemedText>
        </View>
      )}
    </ReportCard>
  );
}

const styles = StyleSheet.create({
  decoration: {
    height: 110,
    opacity: 0.52,
    position: 'absolute',
    right: -7,
    top: -5,
    transform: [{ rotate: '8deg' }],
    width: 86,
  },
  list: {
    gap: 0,
    zIndex: 1,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
    minHeight: 70,
    paddingVertical: 11,
  },
  rowBorder: {
    borderTopColor: reportPalette.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  position: {
    color: reportPalette.muted,
    fontFamily: Fonts.serif,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
    textAlign: 'center',
    width: 18,
  },
  categoryDetails: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  rowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  categoryName: {
    color: reportPalette.ink,
    flex: 1,
    fontFamily: Fonts.serif,
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 22,
  },
  amount: {
    color: reportPalette.ink,
    fontFamily: Fonts.serif,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
    lineHeight: 22,
    maxWidth: '48%',
  },
  rowFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  track: {
    backgroundColor: reportPalette.track,
    borderRadius: 4,
    flex: 1,
    height: 7,
    overflow: 'hidden',
  },
  bar: {
    borderRadius: 4,
    height: '100%',
  },
  percentage: {
    color: reportPalette.oliveDark,
    fontFamily: Fonts.serif,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
    lineHeight: 17,
    textAlign: 'right',
    width: 35,
  },
  empty: {
    alignItems: 'center',
    backgroundColor: reportPalette.cream,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 130,
    padding: Spacing.four,
    zIndex: 1,
  },
  emptyText: {
    color: reportPalette.muted,
    fontFamily: Fonts.serif,
    textAlign: 'center',
  },
});
