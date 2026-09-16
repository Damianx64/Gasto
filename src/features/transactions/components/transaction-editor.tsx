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
import { CategoryIcon } from '@/features/categories/components/category-icon';
import type { Category } from '@/features/categories/types';
import type { Wallet } from '@/features/wallets/types';
import { useWalletScope } from '@/features/wallets/wallet-scope-context';
import { listWallets } from '@/features/wallets/wallets.api';
import { getErrorMessage } from '@/lib/errors';

import { getToday } from '../formatters';
import {
  createTransaction,
  deleteTransaction,
  getTransactionEditorData,
  preloadTransactions,
  updateTransaction,
} from '../transactions.api';
import type { TransactionInput, TransactionType } from '../types';

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
  olivePale: '#E5E7DB',
  surface: '#FEFCF7',
  white: '#FFFDF8',
} as const;

const decorations = {
  branch: require('../../../../assets/decorations/hojas_icono.webp'),
  flower: require('../../../../assets/decorations/flores_vertical_2.webp'),
  leaves: require('../../../../assets/decorations/planta_vertical_1.webp'),
};

const DEFAULT_TRANSFER_DESCRIPTION = 'Transferencia interna';

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
  const { selectedWalletId } = useWalletScope();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [walletId, setWalletId] = useState('');
  const [destinationWalletId, setDestinationWalletId] = useState('');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(getToday());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const hasLoadedEditorRef = useRef(false);
  const initialSelectedWalletIdRef = useRef(selectedWalletId);
  const hasAutomaticTransferDescriptionRef = useRef(false);

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === type),
    [categories, type],
  );
  const cannotCreateTransfer = type === 'transfer' && wallets.length < 2;

  useEffect(() => {
    if (!filteredCategories.some((category) => category.id === categoryId)) {
      setCategoryId(isEditing ? '' : (filteredCategories[0]?.id ?? ''));
    }
  }, [categoryId, filteredCategories, isEditing]);

  useEffect(() => {
    if (walletId && !wallets.some((wallet) => wallet.id === walletId)) {
      setWalletId('');
    }
    if (
      destinationWalletId &&
      !wallets.some((wallet) => wallet.id === destinationWalletId)
    ) {
      setDestinationWalletId('');
    }
  }, [destinationWalletId, walletId, wallets]);

  useEffect(() => {
    async function loadEditorData() {
      setMessage('');
      setIsLoading(true);

      try {
        if (transactionId) {
          const { categories: loadedCategories, transaction, wallets: loadedWallets } =
            await getTransactionEditorData(transactionId);

          setCategories(loadedCategories);
          setWallets(loadedWallets);
          setAmount(formatAmountInput(String(transaction.amount)));
          setType(transaction.type);
          setCategoryId(transaction.category_id ?? '');
          const loadedDescription = transaction.description ?? '';
          setDescription(loadedDescription);
          hasAutomaticTransferDescriptionRef.current =
            transaction.type === 'transfer' &&
            loadedDescription === DEFAULT_TRANSFER_DESCRIPTION;
          setTransactionDate(transaction.transaction_date);
          setWalletId(transaction.wallet_id ?? '');
          setDestinationWalletId(transaction.destination_wallet_id ?? '');
        } else {
          const [loadedCategories, loadedWallets] = await Promise.all([
            listCategories(),
            listWallets(),
          ]);
          setCategories(loadedCategories);
          setWallets(loadedWallets);
          const initialWalletId = initialSelectedWalletIdRef.current;
          setWalletId(
            initialWalletId && loadedWallets.some((wallet) => wallet.id === initialWalletId)
              ? initialWalletId
              : '',
          );
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

      Promise.all([listCategories(), listWallets()])
        .then(([loadedCategories, loadedWallets]) => {
          if (isActive) {
            setCategories(loadedCategories);
            setWallets(loadedWallets);
          }
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

    if (type === 'transfer') {
      if (wallets.length < 2) {
        setMessage('Crea al menos dos billeteras para registrar una transferencia.');
        return;
      }

      if (!walletId || !destinationWalletId) {
        setMessage('Selecciona la billetera de origen y la de destino.');
        return;
      }

      if (walletId === destinationWalletId) {
        setMessage('La billetera de origen y destino deben ser diferentes.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const baseInput = {
        amount: parsedAmount,
        description: description.trim(),
        transactionDate: trimmedDate,
      };
      const input: TransactionInput = type === 'transfer'
        ? {
            ...baseInput,
            destinationWalletId,
            type,
            walletId,
          }
        : {
            ...baseInput,
            categoryId,
            type,
            walletId: walletId || null,
          };

      if (transactionId) {
        await updateTransaction(transactionId, input);
        router.back();
      } else {
        await createTransaction(input);
        await preloadTransactions([selectedWalletId]).catch(() => undefined);
        router.dismissTo('/transactions');
      }
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleTypeChange(nextType: TransactionType) {
    if (nextType === type) return;

    if (nextType === 'transfer') {
      if (!description.trim()) {
        setDescription(DEFAULT_TRANSFER_DESCRIPTION);
        hasAutomaticTransferDescriptionRef.current = true;
      }
      setCategoryId('');
    } else {
      if (
        hasAutomaticTransferDescriptionRef.current &&
        description === DEFAULT_TRANSFER_DESCRIPTION
      ) {
        setDescription('');
      }
      hasAutomaticTransferDescriptionRef.current = false;
      setDestinationWalletId('');
    }

    setMessage('');
    setType(nextType);
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
                        onPress={() => handleTypeChange('expense')}
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
                        onPress={() => handleTypeChange('income')}
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
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: type === 'transfer' }}
                        onPress={() => handleTypeChange('transfer')}
                        style={({ pressed }) => [
                          styles.segmentButton,
                          type === 'transfer' && styles.segmentButtonActive,
                          pressed && styles.buttonPressed,
                        ]}>
                        <SymbolView
                          name={{
                            android: 'swap_horiz',
                            ios: 'arrow.left.arrow.right',
                            web: 'swap_horiz',
                          }}
                          size={20}
                          tintColor={type === 'transfer' ? palette.white : palette.oliveDark}
                        />
                        <EditorText
                          numberOfLines={1}
                          style={[
                            styles.segmentButtonText,
                            styles.transferSegmentText,
                            type === 'transfer' && styles.selectedText,
                          ]}>
                          Transferencia
                        </EditorText>
                      </Pressable>
                    </View>
                  </View>

                  {type !== 'transfer' && wallets.length > 0 ? (
                    <View style={styles.field}>
                      <EditorText style={styles.fieldLabel}>Billetera</EditorText>
                      <View style={styles.walletList}>
                        {wallets.length < 2 ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ selected: walletId === '' }}
                            onPress={() => setWalletId('')}
                            style={({ pressed }) => [
                              styles.walletButton,
                              walletId === '' && styles.walletButtonActive,
                              pressed && styles.buttonPressed,
                            ]}>
                            <View
                              style={[
                                styles.walletIcon,
                                walletId === '' && styles.walletIconActive,
                              ]}>
                              <SymbolView
                                name={{ android: 'wallet', ios: 'wallet.pass', web: 'wallet' }}
                                size={23}
                                tintColor={walletId === '' ? palette.white : palette.oliveDark}
                              />
                            </View>
                            <EditorText
                              numberOfLines={2}
                              style={[
                                styles.walletButtonText,
                                walletId === '' && styles.selectedText,
                              ]}>
                              Sin billetera
                            </EditorText>
                          </Pressable>
                        ) : null}

                        {wallets.map((wallet) => {
                          const isSelected = wallet.id === walletId;
                          return (
                            <Pressable
                              accessibilityLabel={`Billetera ${wallet.name}`}
                              accessibilityRole="button"
                              accessibilityState={{ selected: isSelected }}
                              key={wallet.id}
                              onPress={() => setWalletId(wallet.id)}
                              style={({ pressed }) => [
                                styles.walletButton,
                                isSelected && styles.walletButtonActive,
                                pressed && styles.buttonPressed,
                              ]}>
                              <View style={[styles.walletIcon, isSelected && styles.walletIconActive]}>
                                <SymbolView
                                  name={
                                    wallet.type === 'cash'
                                      ? { android: 'payments', ios: 'banknote', web: 'payments' }
                                      : { android: 'credit_card', ios: 'creditcard', web: 'credit_card' }
                                  }
                                  size={23}
                                  tintColor={isSelected ? palette.white : palette.oliveDark}
                                />
                              </View>
                              <EditorText
                                numberOfLines={2}
                                style={[styles.walletButtonText, isSelected && styles.selectedText]}>
                                {wallet.name}
                              </EditorText>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ) : null}

                  {type === 'transfer' ? (
                    wallets.length < 2 ? (
                      <View style={styles.transferWalletNotice}>
                        <EditorText style={styles.transferWalletNoticeTitle}>
                          Necesitas dos billeteras
                        </EditorText>
                        <EditorText type="small" themeColor="textSecondary">
                          Crea otra billetera para elegir un origen y un destino diferentes.
                        </EditorText>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => router.push('/wallet/new')}
                          style={({ pressed }) => [
                            styles.secondaryButton,
                            pressed && styles.buttonPressed,
                          ]}>
                          <SymbolView
                            name={{ android: 'add', ios: 'plus', web: 'add' }}
                            size={18}
                            tintColor={palette.oliveDark}
                          />
                          <EditorText type="smallBold">Crear billetera</EditorText>
                        </Pressable>
                      </View>
                    ) : (
                      <>
                        <View style={styles.field}>
                          <EditorText style={styles.fieldLabel}>Origen</EditorText>
                          <View style={styles.walletList}>
                            {wallets.map((wallet) => {
                              const isSelected = wallet.id === walletId;
                              const isDisabled = wallet.id === destinationWalletId;

                              return (
                                <Pressable
                                  accessibilityLabel={`Billetera de origen ${wallet.name}`}
                                  accessibilityRole="button"
                                  accessibilityState={{ disabled: isDisabled, selected: isSelected }}
                                  disabled={isDisabled}
                                  key={wallet.id}
                                  onPress={() => setWalletId(wallet.id)}
                                  style={({ pressed }) => [
                                    styles.walletButton,
                                    isSelected && styles.walletButtonActive,
                                    isDisabled && styles.walletButtonDisabled,
                                    pressed && styles.buttonPressed,
                                  ]}>
                                  <View style={[styles.walletIcon, isSelected && styles.walletIconActive]}>
                                    <SymbolView
                                      name={
                                        wallet.type === 'cash'
                                          ? { android: 'payments', ios: 'banknote', web: 'payments' }
                                          : { android: 'credit_card', ios: 'creditcard', web: 'credit_card' }
                                      }
                                      size={23}
                                      tintColor={isSelected ? palette.white : palette.oliveDark}
                                    />
                                  </View>
                                  <EditorText
                                    numberOfLines={2}
                                    style={[styles.walletButtonText, isSelected && styles.selectedText]}>
                                    {wallet.name}
                                  </EditorText>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>

                        <View style={styles.transferArrowRow}>
                          <SymbolView
                            name={{ android: 'south', ios: 'arrow.down', web: 'south' }}
                            size={22}
                            tintColor={palette.oliveDark}
                          />
                        </View>

                        <View style={styles.field}>
                          <EditorText style={styles.fieldLabel}>Destino</EditorText>
                          <View style={styles.walletList}>
                            {wallets.map((wallet) => {
                              const isSelected = wallet.id === destinationWalletId;
                              const isDisabled = wallet.id === walletId;

                              return (
                                <Pressable
                                  accessibilityLabel={`Billetera de destino ${wallet.name}`}
                                  accessibilityRole="button"
                                  accessibilityState={{ disabled: isDisabled, selected: isSelected }}
                                  disabled={isDisabled}
                                  key={wallet.id}
                                  onPress={() => setDestinationWalletId(wallet.id)}
                                  style={({ pressed }) => [
                                    styles.walletButton,
                                    isSelected && styles.walletButtonActive,
                                    isDisabled && styles.walletButtonDisabled,
                                    pressed && styles.buttonPressed,
                                  ]}>
                                  <View style={[styles.walletIcon, isSelected && styles.walletIconActive]}>
                                    <SymbolView
                                      name={
                                        wallet.type === 'cash'
                                          ? { android: 'payments', ios: 'banknote', web: 'payments' }
                                          : { android: 'credit_card', ios: 'creditcard', web: 'credit_card' }
                                      }
                                      size={23}
                                      tintColor={isSelected ? palette.white : palette.oliveDark}
                                    />
                                  </View>
                                  <EditorText
                                    numberOfLines={2}
                                    style={[styles.walletButtonText, isSelected && styles.selectedText]}>
                                    {wallet.name}
                                  </EditorText>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      </>
                    )
                  ) : null}

                  {type !== 'transfer' ? (
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
                            styles.addCategoryButton,
                            pressed && styles.buttonPressed,
                          ]}>
                          <View style={styles.addCategoryIcon}>
                            <SymbolView
                              name={{ android: 'add', ios: 'plus', web: 'add' }}
                              size={24}
                              tintColor={palette.white}
                            />
                          </View>
                          <EditorText numberOfLines={2} style={styles.categoryButtonText}>
                            Añadir
                          </EditorText>
                        </Pressable>
                      ) : null}

                      {filteredCategories.map((category) => {
                        const isSelected = category.id === categoryId;

                        return (
                          <Pressable
                            accessibilityLabel={`Categoría ${category.name}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                            key={category.id}
                            onPress={() => setCategoryId(category.id)}
                            style={({ pressed }) => [
                              styles.categoryButton,
                              isSelected && [
                                styles.categoryButtonActive,
                                { borderColor: category.color || palette.oliveDark },
                              ],
                              pressed && styles.buttonPressed,
                            ]}>
                            <CategoryIcon
                              color={category.color}
                              iconKey={category.icon_key}
                              size={42}
                              symbolSize={23}
                            />
                            <EditorText numberOfLines={2} style={styles.categoryButtonText}>
                              {category.name}
                            </EditorText>
                            {isSelected ? (
                              <View
                                style={[
                                  styles.categorySelectedBadge,
                                  { backgroundColor: category.color || palette.oliveDark },
                                ]}>
                                <SymbolView
                                  name={{ android: 'check', ios: 'checkmark', web: 'check' }}
                                  size={12}
                                  tintColor={palette.white}
                                />
                              </View>
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                  ) : null}

                  <View style={styles.field}>
                    <EditorText style={styles.fieldLabel}>Descripción</EditorText>
                    <View style={styles.inputShell}>
                      <TextInput
                        accessibilityLabel="Descripción"
                        onChangeText={(value) => {
                          hasAutomaticTransferDescriptionRef.current = false;
                          setDescription(value);
                        }}
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
                    accessibilityState={{ disabled: isSubmitting || isDeleting || cannotCreateTransfer }}
                    disabled={isSubmitting || isDeleting || cannotCreateTransfer}
                    onPress={handleSubmit}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      cannotCreateTransfer && styles.buttonDisabled,
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
  transferSegmentText: {
    fontSize: 12,
    lineHeight: 16,
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
    justifyContent: 'space-between',
    rowGap: 10,
  },
  walletList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  walletButton: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    minHeight: 62,
    paddingHorizontal: 12,
    width: '48%',
  },
  walletButtonActive: {
    backgroundColor: palette.olive,
    borderColor: palette.oliveDark,
  },
  walletButtonDisabled: {
    opacity: 0.38,
  },
  walletIcon: {
    alignItems: 'center',
    backgroundColor: palette.olivePale,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  walletIconActive: {
    backgroundColor: palette.oliveDark,
  },
  walletButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 19,
  },
  transferArrowRow: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
    marginVertical: -4,
  },
  transferWalletNotice: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 17,
    borderWidth: 1,
    gap: 10,
    padding: Spacing.three,
  },
  transferWalletNoticeTitle: {
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 24,
  },
  secondaryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: palette.olive,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 14,
  },
  categoryButton: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 1,
    gap: 5,
    justifyContent: 'center',
    minHeight: 88,
    overflow: 'hidden',
    paddingHorizontal: 5,
    paddingVertical: 9,
    position: 'relative',
    shadowColor: '#6D6659',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    width: '23%',
  },
  categoryButtonActive: {
    backgroundColor: palette.olivePale,
    borderWidth: 2,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    maxWidth: '100%',
    textAlign: 'center',
    zIndex: 1,
  },
  addCategoryButton: {
    borderColor: palette.olive,
  },
  addCategoryIcon: {
    alignItems: 'center',
    backgroundColor: palette.olive,
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  categorySelectedBadge: {
    alignItems: 'center',
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    position: 'absolute',
    right: 5,
    top: 5,
    width: 18,
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
  buttonDisabled: {
    opacity: 0.45,
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
