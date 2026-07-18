import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DateTimePicker, {
  type DateTimePickerChangeEvent,
} from '@expo/ui/community/datetime-picker';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
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
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { listCategories } from '@/features/categories/categories.api';
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

const palette = {
  background: '#FBF8F1',
  border: '#E4DAC9',
  danger: '#B65336',
  dangerPale: '#FBEEE8',
  expense: '#C45D32',
  ink: '#303A29',
  muted: '#89897F',
  olive: '#7D8866',
  oliveDark: '#4E5C39',
  oliveLight: '#C9D5AC',
  surface: '#FEFCF7',
  white: '#FFFDF8',
} as const;

const decorations = {
  branch: require('../../../../assets/decorations/hojas_icono.webp'),
  flower: require('../../../../assets/decorations/flores_vertical_2.webp'),
  leaves: require('../../../../assets/decorations/planta_vertical_1.webp'),
};

type TransactionEditorProps = {
  transactionId?: string;
};

function EditorText({ style, themeColor, ...props }: ThemedTextProps) {
  return (
    <ThemedText
      {...props}
      style={[
        styles.editorText,
        themeColor === 'textSecondary' && styles.secondaryText,
        style,
      ]}
    />
  );
}

function parseDateInput(date: string) {
  const [year, month, day] = date.split('-').map(Number);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

function formatDateInput(date: Date) {
  const year = Platform.OS === 'android' ? date.getUTCFullYear() : date.getFullYear();
  const month = String(
    (Platform.OS === 'android' ? date.getUTCMonth() : date.getMonth()) + 1,
  ).padStart(2, '0');
  const day = String(
    Platform.OS === 'android' ? date.getUTCDate() : date.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatAmountInput(value: string) {
  const sanitizedValue = value.replace(/,/g, '').replace(/[^\d.]/g, '');
  const [integerPart = '', ...decimalParts] = sanitizedValue.split('.');
  const hasDecimalPoint = sanitizedValue.includes('.');
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, '') || (hasDecimalPoint ? '0' : '');
  const groupedInteger = normalizedInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  if (!hasDecimalPoint) return groupedInteger;

  return `${groupedInteger}.${decimalParts.join('')}`;
}

export function TransactionEditor({ transactionId }: TransactionEditorProps) {
  const isEditing = Boolean(transactionId);
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
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
  const hasLoadedEditorRef = useRef(false);

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
          setAmount(formatAmountInput(String(transaction.amount)));
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
        hasLoadedEditorRef.current = true;
        setIsLoading(false);
      }
    }

    loadEditorData();
  }, [transactionId]);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedEditorRef.current) return;

      let isActive = true;

      listCategories()
        .then((loadedCategories) => {
          if (isActive) setCategories(loadedCategories);
        })
        .catch((error) => {
          if (isActive) setMessage(getErrorMessage(error));
        });

      return () => {
        isActive = false;
      };
    }, []),
  );

  async function handleSubmit() {
    setMessage('');

    const parsedAmount = Number(amount.replace(/,/g, ''));
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
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}>
          <ScrollView
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            <View style={styles.content}>
              {isLoading ? (
                <View style={styles.stateContainer}>
                  <ActivityIndicator color={palette.oliveDark} size="large" />
                  <EditorText type="small" themeColor="textSecondary">
                    Cargando movimiento...
                  </EditorText>
                </View>
              ) : (
                <View style={styles.form}>
                  <View style={styles.field}>
                    <EditorText style={styles.fieldLabel}>Monto</EditorText>
                    <View style={styles.inputShell}>
                      <TextInput
                        accessibilityLabel="Monto"
                        inputMode="decimal"
                        keyboardType="decimal-pad"
                        onChangeText={(value) => setAmount(formatAmountInput(value))}
                        placeholder="0.00"
                        placeholderTextColor={palette.muted}
                        selectionColor={palette.olive}
                        style={[styles.input, styles.amountInput]}
                        value={amount}
                      />
                      <Image
                        accessible={false}
                        contentFit="contain"
                        pointerEvents="none"
                        source={decorations.branch}
                        style={styles.inputDecoration}
                      />
                    </View>
                  </View>

                  <View style={styles.field}>
                    <EditorText style={styles.fieldLabel}>Tipo</EditorText>
                    <View style={styles.segment}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: type === 'expense' }}
                        onPress={() => setType('expense')}
                        style={({ pressed }) => [
                          styles.segmentButton,
                          type === 'expense' && styles.segmentButtonActive,
                          type === 'expense' && styles.expenseSegmentButtonActive,
                          pressed && styles.buttonPressed,
                        ]}>
                        {type === 'expense' ? (
                          <Image
                            accessible={false}
                            contentFit="contain"
                            pointerEvents="none"
                            source={decorations.flower}
                            style={[styles.segmentDecoration, styles.expenseSegmentDecoration]}
                          />
                        ) : null}
                        <EditorText
                          style={[
                            styles.segmentButtonText,
                            type === 'expense' && styles.selectedText,
                          ]}>
                          Gasto
                        </EditorText>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: type === 'income' }}
                        onPress={() => setType('income')}
                        style={({ pressed }) => [
                          styles.segmentButton,
                          type === 'income' && styles.segmentButtonActive,
                          pressed && styles.buttonPressed,
                        ]}>
                        {type === 'income' ? (
                          <Image
                            accessible={false}
                            contentFit="contain"
                            pointerEvents="none"
                            source={decorations.leaves}
                            style={[styles.segmentDecoration, styles.incomeSegmentDecoration]}
                          />
                        ) : null}
                        <EditorText
                          style={[
                            styles.segmentButtonText,
                            type === 'income' && styles.selectedText,
                          ]}>
                          Ingreso
                        </EditorText>
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.field}>
                    <EditorText style={styles.fieldLabel}>Categoría</EditorText>
                    <View style={styles.categoryList}>
                      {filteredCategories.length === 0 ? (
                        <Pressable
                          accessibilityHint="Abre la pantalla para crear una categoría"
                          accessibilityRole="button"
                          onPress={() => router.push('/category/new')}
                          style={({ pressed }) => [
                            styles.categoryButton,
                            styles.categoryButtonActive,
                            pressed && styles.buttonPressed,
                          ]}>
                          <EditorText
                            numberOfLines={1}
                            style={[styles.categoryButtonText, styles.selectedText]}>
                            Añadir
                          </EditorText>
                          <Image
                            accessible={false}
                            contentFit="contain"
                            pointerEvents="none"
                            source={decorations.branch}
                            style={styles.categoryDecoration}
                          />
                        </Pressable>
                      ) : null}

                      {filteredCategories.map((category) => {
                        const isSelected = category.id === categoryId;

                        return (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                            key={category.id}
                            onPress={() => setCategoryId(category.id)}
                            style={({ pressed }) => [
                              styles.categoryButton,
                              isSelected && styles.categoryButtonActive,
                              pressed && styles.buttonPressed,
                            ]}>
                            <EditorText
                              numberOfLines={1}
                              style={[
                                styles.categoryButtonText,
                                isSelected && styles.selectedText,
                              ]}>
                              {category.name}
                            </EditorText>
                            {isSelected ? (
                              <Image
                                accessible={false}
                                contentFit="contain"
                                pointerEvents="none"
                                source={decorations.branch}
                                style={styles.categoryDecoration}
                              />
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.field}>
                    <EditorText style={styles.fieldLabel}>Descripción</EditorText>
                    <View style={styles.inputShell}>
                      <TextInput
                        accessibilityLabel="Descripción"
                        onChangeText={setDescription}
                        placeholder="Opcional"
                        placeholderTextColor={palette.muted}
                        selectionColor={palette.olive}
                        style={styles.input}
                        value={description}
                      />
                      <Image
                        accessible={false}
                        contentFit="contain"
                        pointerEvents="none"
                        source={decorations.branch}
                        style={styles.inputDecoration}
                      />
                    </View>
                  </View>

                  <View style={styles.field}>
                    <EditorText style={styles.fieldLabel}>Fecha</EditorText>
                    <View style={styles.dateInputRow}>
                      <View style={[styles.inputShell, styles.dateInputShell]}>
                        <TextInput
                          accessibilityLabel="Fecha"
                          inputMode="numeric"
                          onChangeText={setTransactionDate}
                          placeholder="AAAA-MM-DD"
                          placeholderTextColor={palette.muted}
                          selectionColor={palette.olive}
                          style={[styles.input, styles.dateInput]}
                          value={transactionDate}
                        />
                      </View>
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
                          fallback={<EditorText style={styles.calendarFallback}>Cal</EditorText>}
                          name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
                          size={25}
                          tintColor={palette.oliveDark}
                        />
                        <Image
                          accessible={false}
                          contentFit="contain"
                          pointerEvents="none"
                          source={decorations.flower}
                          style={styles.calendarDecoration}
                        />
                      </Pressable>
                    </View>

                    {showDatePicker && Platform.OS !== 'web' ? (
                      <DateTimePicker
                        accentColor={isDarkMode ? palette.oliveLight : palette.oliveDark}
                        display="default"
                        mode="date"
                        negativeButton={{ label: 'Cancelar' }}
                        onDismiss={() => setShowDatePicker(false)}
                        onValueChange={handleDatePickerChange}
                        positiveButton={{ label: 'Aceptar' }}
                        themeVariant={isDarkMode ? 'dark' : 'light'}
                        value={parseDateInput(transactionDate)}
                      />
                    ) : null}
                  </View>

                  {message ? (
                    <View style={styles.errorCard}>
                      <EditorText
                        accessibilityLiveRegion="polite"
                        style={styles.errorText}>
                        {message}
                      </EditorText>
                    </View>
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
                      <ActivityIndicator color={palette.white} />
                    ) : (
                      <EditorText style={styles.primaryButtonText}>
                        {isEditing ? 'Guardar cambios' : 'Guardar movimiento'}
                      </EditorText>
                    )}
                    <Image
                      accessible={false}
                      contentFit="contain"
                      pointerEvents="none"
                      source={decorations.branch}
                      style={styles.buttonDecoration}
                    />
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
                        <ActivityIndicator color={palette.danger} />
                      ) : (
                        <EditorText style={styles.deleteButtonText}>
                          Eliminar movimiento
                        </EditorText>
                      )}
                    </Pressable>
                  ) : null}
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.background,
    flex: 1,
  },
  safeArea: {
    backgroundColor: palette.background,
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.five,
  },
  content: {
    alignSelf: 'center',
    maxWidth: 560,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    width: '100%',
  },
  editorText: {
    color: palette.ink,
    fontFamily: Fonts.serif,
  },
  secondaryText: {
    color: palette.muted,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 28,
    minHeight: 54,
  },
  screenTitle: {
    flexShrink: 1,
    fontSize: 39,
    fontWeight: '500',
    letterSpacing: -0.8,
    lineHeight: 48,
  },
  titleDecoration: {
    height: 55,
    marginLeft: -2,
    transform: [{ rotate: '64deg' }],
    width: 51,
  },
  stateContainer: {
    alignItems: 'center',
    gap: Spacing.three,
    justifyContent: 'center',
    minHeight: 360,
  },
  form: {
    gap: 20,
  },
  field: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 22,
    fontWeight: '500',
    lineHeight: 28,
  },
  inputShell: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 17,
    borderWidth: 1,
    elevation: 2,
    minHeight: 62,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#6D6659',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  input: {
    color: palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 20,
    minHeight: 62,
    paddingHorizontal: 18,
    paddingRight: 54,
    position: 'relative',
    zIndex: 1,
  },
  amountInput: {
    fontSize: 27,
    minHeight: 70,
  },
  inputDecoration: {
    bottom: -24,
    height: 87,
    opacity: 0.83,
    position: 'absolute',
    right: 3,
    transform: [{ rotate: '32deg' }],
    width: 31,
    zIndex: 2,
  },
  segment: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 17,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    minHeight: 64,
    overflow: 'hidden',
    padding: 4,
    shadowColor: '#6D6659',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 13,
    flex: 1,
    justifyContent: 'center',
    minHeight: 54,
    overflow: 'hidden',
    position: 'relative',
  },
  segmentButtonActive: {
    backgroundColor: palette.olive,
  },
  expenseSegmentButtonActive: {
    backgroundColor: palette.expense,
  },
  segmentButtonText: {
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 26,
    zIndex: 1,
  },
  selectedText: {
    color: palette.white,
  },
  segmentDecoration: {
    bottom: -31,
    height: 99,
    left: -7,
    opacity: 0.8,
    position: 'absolute',
    width: 42,
  },
  expenseSegmentDecoration: {
    transform: [{ rotate: '12deg' }],
  },
  incomeSegmentDecoration: {
    transform: [{ rotate: '34deg' }],
  },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryButton: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 1,
    justifyContent: 'center',
    minHeight: 52,
    overflow: 'hidden',
    paddingHorizontal: 19,
    paddingVertical: 10,
    position: 'relative',
    shadowColor: '#6D6659',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
  },
  categoryButtonActive: {
    backgroundColor: palette.olive,
    borderColor: palette.oliveDark,
    borderWidth: 2,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  categoryButtonText: {
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 24,
    maxWidth: 190,
    zIndex: 1,
  },
  categoryDecoration: {
    bottom: -28,
    height: 80,
    opacity: 0.82,
    position: 'absolute',
    right: -2,
    transform: [{ rotate: '30deg' }],
    width: 29,
  },
  dateInputRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: 10,
  },
  dateInputShell: {
    flex: 1,
  },
  dateInput: {
    fontVariant: ['tabular-nums'],
    paddingRight: 18,
  },
  calendarButton: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 17,
    borderWidth: 1,
    elevation: 2,
    justifyContent: 'center',
    minHeight: 62,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#6D6659',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    width: 68,
  },
  calendarFallback: {
    color: palette.oliveDark,
    fontSize: 14,
    fontWeight: '600',
    zIndex: 1,
  },
  calendarDecoration: {
    bottom: -19,
    height: 53,
    opacity: 0.78,
    position: 'absolute',
    right: -3,
    transform: [{ rotate: '23deg' }],
    width: 32,
  },
  errorCard: {
    backgroundColor: palette.dangerPale,
    borderColor: '#EAC7B9',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
  },
  errorText: {
    color: palette.danger,
    fontSize: 16,
    lineHeight: 22,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: palette.olive,
    borderColor: '#717B5D',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 4,
    justifyContent: 'center',
    minHeight: 62,
    overflow: 'hidden',
    paddingHorizontal: 54,
    paddingVertical: 13,
    position: 'relative',
    shadowColor: '#4D503E',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 9,
  },
  primaryButtonText: {
    color: palette.white,
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 27,
    textAlign: 'center',
    zIndex: 1,
  },
  buttonDecoration: {
    bottom: -25,
    height: 92,
    opacity: 0.84,
    position: 'absolute',
    right: 8,
    transform: [{ rotate: '27deg' }],
    width: 34,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: palette.dangerPale,
    borderColor: '#EAC7B9',
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
  },
  deleteButtonText: {
    color: palette.danger,
    fontSize: 18,
    fontWeight: '500',
  },
  buttonPressed: {
    opacity: 0.68,
  },
});
