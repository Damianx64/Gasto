import { useEffect, useMemo, useState } from 'react';
import DateTimePicker, {
  type DateTimePickerChangeEvent,
} from '@expo/ui/community/datetime-picker';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { listCategories } from '@/features/categories/categories.api';
import { CategoryIcon } from '@/features/categories/components/category-icon';
import type { Category } from '@/features/categories/types';
import { getErrorMessage } from '@/lib/errors';

import { getToday } from '../formatters';
import {
  createTransaction,
  deleteTransaction,
  getTransactionEditorData,
  updateTransaction,
} from '../transactions.api';
import type { TransactionType } from '../types';

type TransactionEditorProps = {
  transactionId?: string;
};

function parseDateInput(date: string) {
  const [year, month, day] = date.split('-').map(Number);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function TransactionEditor({ transactionId }: TransactionEditorProps) {
  const isEditing = Boolean(transactionId);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(getToday());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState('');

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === type),
    [categories, type],
  );

  useEffect(() => {
    if (!filteredCategories.some((category) => category.id === categoryId)) {
      setCategoryId(isEditing ? '' : (filteredCategories[0]?.id ?? ''));
    }
  }, [categoryId, filteredCategories, isEditing]);

  useEffect(() => {
    async function loadEditorData() {
      setMessage('');
      setIsLoading(true);

      try {
        if (transactionId) {
          const { categories: loadedCategories, transaction } =
            await getTransactionEditorData(transactionId);

          setCategories(loadedCategories);
          setAmount(String(transaction.amount));
          setType(transaction.type);
          setCategoryId(transaction.category_id ?? '');
          setDescription(transaction.description ?? '');
          setTransactionDate(transaction.transaction_date);
        } else {
          setCategories(await listCategories());
        }
      } catch (error) {
        setMessage(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    }

    loadEditorData();
  }, [transactionId]);

  async function handleSubmit() {
    setMessage('');

    const parsedAmount = Number(amount.replace(',', '.'));
    const trimmedDate = transactionDate.trim();

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setMessage('Escribe un monto válido mayor a cero.');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      setMessage('Escribe la fecha con formato AAAA-MM-DD.');
      return;
    }

    setIsSubmitting(true);

    try {
      const input = {
        amount: parsedAmount,
        categoryId,
        description: description.trim(),
        transactionDate: trimmedDate,
        type,
      };

      if (transactionId) {
        await updateTransaction(transactionId, input);
        router.back();
      } else {
        await createTransaction(input);
        router.replace('/transactions');
      }
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    setMessage('');
    setIsDeleting(true);

    if (!transactionId) {
      setIsDeleting(false);
      return;
    }

    try {
      await deleteTransaction(transactionId);
      router.back();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Eliminar movimiento',
      'Esta acción eliminará el movimiento permanentemente.',
      [
        { style: 'cancel', text: 'Cancelar' },
        {
          onPress: handleDelete,
          style: 'destructive',
          text: 'Eliminar',
        },
      ],
    );
  }

  function handleDatePickerChange(_: DateTimePickerChangeEvent, selectedDate: Date) {
    setTransactionDate(formatDateInput(selectedDate));
    setShowDatePicker(false);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}>
          <ScrollView
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            <ThemedText type="subtitle">
              {isEditing ? 'Editar movimiento' : 'Nuevo movimiento'}
            </ThemedText>

            {isLoading ? (
              <View style={styles.stateContainer}>
                <ActivityIndicator />
                <ThemedText type="small" themeColor="textSecondary">
                  Cargando movimiento...
                </ThemedText>
              </View>
            ) : (
              <View style={styles.form}>
                <View style={styles.field}>
                  <ThemedText type="smallBold">Monto</ThemedText>
                  <TextInput
                    inputMode="decimal"
                    keyboardType="decimal-pad"
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor="#9ca3af"
                    style={styles.input}
                    value={amount}
                  />
                </View>

                <View style={styles.field}>
                  <ThemedText type="smallBold">Tipo</ThemedText>
                  <View style={styles.segment}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setType('expense')}
                      style={({ pressed }) => [
                        styles.segmentButton,
                        type === 'expense' && styles.segmentButtonActive,
                        pressed && styles.buttonPressed,
                      ]}>
                      <ThemedText
                        type="smallBold"
                        style={type === 'expense' && styles.segmentButtonTextActive}>
                        Gasto
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setType('income')}
                      style={({ pressed }) => [
                        styles.segmentButton,
                        type === 'income' && styles.segmentButtonActive,
                        pressed && styles.buttonPressed,
                      ]}>
                      <ThemedText
                        type="smallBold"
                        style={type === 'income' && styles.segmentButtonTextActive}>
                        Ingreso
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.field}>
                  <ThemedText type="smallBold">Categoría</ThemedText>
                  <View style={styles.categoryList}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setCategoryId('')}
                      style={({ pressed }) => [
                        styles.categoryButton,
                        !categoryId && styles.categoryButtonActive,
                        pressed && styles.buttonPressed,
                      ]}>
                      <CategoryIcon color="#9ca3af" size={24} symbolSize={14} />
                      <ThemedText
                        type="smallBold"
                        style={!categoryId && styles.categoryButtonTextActive}>
                        Sin categoría
                      </ThemedText>
                    </Pressable>

                    {filteredCategories.map((category) => (
                      <Pressable
                        accessibilityRole="button"
                        key={category.id}
                        onPress={() => setCategoryId(category.id)}
                        style={({ pressed }) => [
                          styles.categoryButton,
                          category.id === categoryId && styles.categoryButtonActive,
                          pressed && styles.buttonPressed,
                        ]}>
                        <CategoryIcon
                          color={category.color}
                          iconKey={category.icon_key}
                          size={24}
                          symbolSize={14}
                        />
                        <ThemedText
                          type="smallBold"
                          style={category.id === categoryId && styles.categoryButtonTextActive}>
                          {category.name}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.field}>
                  <ThemedText type="smallBold">Descripción</ThemedText>
                  <TextInput
                    onChangeText={setDescription}
                    placeholder="Opcional"
                    placeholderTextColor="#9ca3af"
                    style={styles.input}
                    value={description}
                  />
                </View>

                <View style={styles.field}>
                  <ThemedText type="smallBold">Fecha</ThemedText>
                  <View style={styles.dateInputRow}>
                    <TextInput
                      inputMode="numeric"
                      onChangeText={setTransactionDate}
                      placeholder="AAAA-MM-DD"
                      placeholderTextColor="#9ca3af"
                      style={[styles.input, styles.dateInput]}
                      value={transactionDate}
                    />
                    <Pressable
                      accessibilityLabel="Seleccionar fecha"
                      accessibilityRole="button"
                      onPress={() => {
                        if (Platform.OS !== 'web') {
                          setShowDatePicker(true);
                        }
                      }}
                      style={({ pressed }) => [
                        styles.calendarButton,
                        pressed && styles.buttonPressed,
                      ]}>
                      <SymbolView
                        fallback={<ThemedText type="smallBold">Cal</ThemedText>}
                        name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
                        size={22}
                        tintColor="#111827"
                      />
                    </Pressable>
                  </View>

                  {showDatePicker && Platform.OS !== 'web' ? (
                    <DateTimePicker
                      accentColor="#111827"
                      display="default"
                      mode="date"
                      negativeButton={{ label: 'Cancelar' }}
                      onDismiss={() => setShowDatePicker(false)}
                      onValueChange={handleDatePickerChange}
                      positiveButton={{ label: 'Aceptar' }}
                      value={parseDateInput(transactionDate)}
                    />
                  ) : null}
                </View>

                {message ? (
                  <ThemedText
                    accessibilityLiveRegion="polite"
                    type="smallBold"
                    style={styles.errorText}>
                    {message}
                  </ThemedText>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting || isDeleting}
                  onPress={handleSubmit}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    (pressed || isSubmitting) && styles.buttonPressed,
                  ]}>
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <ThemedText type="smallBold" style={styles.primaryButtonText}>
                      {isEditing ? 'Guardar cambios' : 'Guardar movimiento'}
                    </ThemedText>
                  )}
                </Pressable>

                {isEditing ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={isSubmitting || isDeleting}
                    onPress={confirmDelete}
                    style={({ pressed }) => [
                      styles.deleteButton,
                      (pressed || isDeleting) && styles.buttonPressed,
                    ]}>
                    {isDeleting ? (
                      <ActivityIndicator color="#dc2626" />
                    ) : (
                      <ThemedText type="smallBold" style={styles.deleteButtonText}>
                        Eliminar movimiento
                      </ThemedText>
                    )}
                  </Pressable>
                ) : null}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  stateContainer: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.five,
  },
  form: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
  },
  dateInputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  dateInput: {
    flex: 1,
  },
  calendarButton: {
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  segment: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    flexDirection: 'row',
    padding: Spacing.one,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
  },
  segmentButtonActive: {
    backgroundColor: '#111827',
  },
  segmentButtonTextActive: {
    color: '#ffffff',
  },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  categoryButton: {
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  categoryButtonActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  categoryButtonTextActive: {
    color: '#ffffff',
  },
  errorText: {
    color: '#dc2626',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  deleteButtonText: {
    color: '#dc2626',
  },
  buttonPressed: {
    opacity: 0.75,
  },
});
