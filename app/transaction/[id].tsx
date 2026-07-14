import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
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
import { supabase } from '@/lib/supabase';

type TransactionType = 'income' | 'expense';

type Category = {
  id: string;
  name: string;
  type: TransactionType;
};

type TransactionRow = {
  amount: number | string;
  category_id: string | null;
  description: string | null;
  transaction_date: string;
  type: TransactionType;
};

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
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
    if (categoryId && !filteredCategories.some((category) => category.id === categoryId)) {
      setCategoryId('');
    }
  }, [categoryId, filteredCategories]);

  useEffect(() => {
    async function loadTransaction() {
      setMessage('');
      setIsLoading(true);

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        setMessage(userError?.message ?? 'No se encontró una sesión activa.');
        setIsLoading(false);
        return;
      }

      const [categoriesResponse, transactionResponse] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name, type')
          .eq('user_id', userData.user.id)
          .order('name', { ascending: true }),
        supabase
          .from('transactions')
          .select('amount, category_id, description, transaction_date, type')
          .eq('id', id)
          .eq('user_id', userData.user.id)
          .single(),
      ]);

      if (categoriesResponse.error) {
        setMessage(categoriesResponse.error.message);
        setIsLoading(false);
        return;
      }

      if (transactionResponse.error) {
        setMessage(transactionResponse.error.message);
        setIsLoading(false);
        return;
      }

      const transaction = transactionResponse.data as TransactionRow;

      setCategories((categoriesResponse.data ?? []) as Category[]);
      setAmount(String(transaction.amount));
      setType(transaction.type);
      setCategoryId(transaction.category_id ?? '');
      setDescription(transaction.description ?? '');
      setTransactionDate(transaction.transaction_date);
      setIsLoading(false);
    }

    if (id) {
      loadTransaction();
    }
  }, [id]);

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

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setMessage(userError?.message ?? 'No se encontró una sesión activa.');
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from('transactions')
      .update({
        amount: parsedAmount,
        category_id: categoryId || null,
        description: description.trim() || null,
        transaction_date: trimmedDate,
        type,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userData.user.id);

    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.back();
  }

  async function handleDelete() {
    setMessage('');
    setIsDeleting(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setMessage(userError?.message ?? 'No se encontró una sesión activa.');
      setIsDeleting(false);
      return;
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userData.user.id);

    setIsDeleting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.back();
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
            <ThemedText type="subtitle">Editar movimiento</ThemedText>

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
                  <TextInput
                    inputMode="numeric"
                    onChangeText={setTransactionDate}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor="#9ca3af"
                    style={styles.input}
                    value={transactionDate}
                  />
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
                      Guardar cambios
                    </ThemedText>
                  )}
                </Pressable>

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
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
    borderRadius: 8,
    borderWidth: 1,
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
