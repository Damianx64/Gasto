import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import type { ReportMonth } from '@/features/reports/report-data';
import { reportPalette } from '@/features/reports/report-theme';

type ReportMonthSelectorProps = {
  months: ReportMonth[];
  onChange: (monthKey: string) => void;
  selectedMonthKey: string;
};

export function ReportMonthSelector({
  months,
  onChange,
  selectedMonthKey,
}: ReportMonthSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedMonth = months.find((month) => month.key === selectedMonthKey);
  const hasMonths = months.length > 0;

  function selectMonth(monthKey: string) {
    onChange(monthKey);
    setIsOpen(false);
  }

  return (
    <>
      <View style={styles.field}>
        <ThemedText style={styles.fieldLabel}>Mes del reporte</ThemedText>
        <Pressable
          accessibilityHint={
            hasMonths
              ? 'Abre la lista de meses con movimientos registrados'
              : 'Se habilitará cuando registres un ingreso o gasto'
          }
          accessibilityLabel={
            selectedMonth ? `Mes del reporte: ${selectedMonth.label}` : 'No hay meses con datos'
          }
          accessibilityRole="button"
          accessibilityState={{ disabled: !hasMonths, expanded: isOpen }}
          disabled={!hasMonths}
          onPress={() => setIsOpen(true)}
          style={({ pressed }) => [
            styles.selector,
            !hasMonths && styles.selectorDisabled,
            pressed && hasMonths && styles.pressed,
          ]}>
          <View style={styles.selectorCopy}>
            <SymbolView
              name={{ android: 'calendar_month', ios: 'calendar', web: 'calendar_month' }}
              size={18}
              tintColor={hasMonths ? reportPalette.oliveDark : reportPalette.muted}
            />
            <ThemedText
              numberOfLines={1}
              style={[styles.selectorText, !hasMonths && styles.selectorTextDisabled]}>
              {selectedMonth?.label ?? 'Sin meses con datos'}
            </ThemedText>
          </View>
          <SymbolView
            name={{ android: 'keyboard_arrow_down', ios: 'chevron.down', web: 'expand_more' }}
            size={18}
            tintColor={hasMonths ? reportPalette.oliveDark : reportPalette.muted}
          />
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
        statusBarTranslucent
        transparent
        visible={isOpen}>
        <Pressable
          accessibilityLabel="Cerrar selector de mes"
          accessibilityRole="button"
          onPress={() => setIsOpen(false)}
          style={styles.backdrop}>
          <SafeAreaView style={styles.safeArea}>
            <Pressable
              accessibilityViewIsModal
              onPress={(event) => event.stopPropagation()}
              style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeading}>
                  <ThemedText style={styles.modalTitle}>Selecciona un mes</ThemedText>
                  <ThemedText style={styles.modalSubtitle}>
                    Solo aparecen meses con movimientos registrados.
                  </ThemedText>
                </View>
                <Pressable
                  accessibilityLabel="Cerrar"
                  accessibilityRole="button"
                  hitSlop={10}
                  onPress={() => setIsOpen(false)}
                  style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
                  <SymbolView
                    name={{ android: 'close', ios: 'xmark', web: 'close' }}
                    size={20}
                    tintColor={reportPalette.muted}
                  />
                </Pressable>
              </View>

              <ScrollView
                contentContainerStyle={styles.monthList}
                showsVerticalScrollIndicator={false}>
                {months.map((month) => {
                  const isSelected = month.key === selectedMonthKey;

                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                      key={month.key}
                      onPress={() => selectMonth(month.key)}
                      style={({ pressed }) => [
                        styles.monthOption,
                        isSelected && styles.monthOptionSelected,
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText
                        style={[
                          styles.monthOptionText,
                          isSelected && styles.monthOptionTextSelected,
                        ]}>
                        {month.label}
                      </ThemedText>
                      {isSelected ? (
                        <SymbolView
                          name={{ android: 'check', ios: 'checkmark', web: 'check' }}
                          size={19}
                          tintColor={reportPalette.oliveDark}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 7,
  },
  fieldLabel: {
    color: reportPalette.muted,
    fontFamily: Fonts.serif,
    fontSize: 14,
    lineHeight: 19,
    paddingHorizontal: 4,
  },
  selector: {
    alignItems: 'center',
    backgroundColor: reportPalette.surface,
    borderColor: reportPalette.border,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    shadowColor: '#6D6659',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  selectorDisabled: {
    backgroundColor: reportPalette.cream,
    elevation: 0,
    opacity: 0.68,
    shadowOpacity: 0,
  },
  selectorCopy: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minWidth: 0,
  },
  selectorText: {
    color: reportPalette.ink,
    flex: 1,
    fontFamily: Fonts.serif,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
  },
  selectorTextDisabled: {
    color: reportPalette.muted,
  },
  backdrop: {
    backgroundColor: 'rgba(35, 40, 31, 0.42)',
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    alignSelf: 'center',
    backgroundColor: reportPalette.surface,
    borderColor: reportPalette.border,
    borderRadius: 24,
    borderWidth: 1,
    elevation: 8,
    gap: Spacing.three,
    maxHeight: '78%',
    maxWidth: 430,
    padding: Spacing.four,
    shadowColor: reportPalette.ink,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'space-between',
  },
  modalHeading: {
    flex: 1,
    gap: 3,
  },
  modalTitle: {
    color: reportPalette.ink,
    fontFamily: Fonts.serif,
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 30,
  },
  modalSubtitle: {
    color: reportPalette.muted,
    fontFamily: Fonts.serif,
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  monthList: {
    gap: Spacing.two,
  },
  monthOption: {
    alignItems: 'center',
    borderColor: reportPalette.border,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 50,
    paddingHorizontal: Spacing.three,
  },
  monthOptionSelected: {
    backgroundColor: reportPalette.oliveSoft,
    borderColor: reportPalette.olive,
  },
  monthOptionText: {
    color: reportPalette.ink,
    fontFamily: Fonts.serif,
    fontSize: 16,
    lineHeight: 22,
  },
  monthOptionTextSelected: {
    color: reportPalette.oliveDark,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.68,
  },
});
