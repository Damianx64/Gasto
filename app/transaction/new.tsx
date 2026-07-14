import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
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

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export default function NewTransactionScreen() {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(getToday());
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === type),
    [categories, type],
  );

  useEffect(() => {
    async function loadCategories() {
      setMessage('');
      setIsLoadingCategories(true);

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        setMessage(userError?.message ?? 'No se encontró una sesión activa.');
        setIsLoadingCategories(false);
        return;
      }

      const { data, error } = await supabase
        .from('categories')
        .select('id, name, type')
        .eq('user_id', userData.user.id)
        .order('name', { ascending: true });

      if (error) {
        setMessage(error.message);
        setIsLoadingCategories(false);
        return;
      }

      setCategories((data ?? []) as Category[]);
      setIsLoadingCategories(false);
    }

    loadCategories();
  }, []);

  useEffect(() => {
    if (filteredCategories.length === 0) {
      setCategoryId('');
      return;
    }

    if (!filteredCategories.some((category) => category.id === categoryId)) {
      setCategoryId(filteredCategories[0].id);
    }
  }, [categoryId, filteredCategories]);

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

    const { error } = await supabase.from('transactions').insert({
      amount: parsedAmount,
      category_id: categoryId || null,
      description: description.trim() || null,
      transaction_date: trimmedDate,
      type,
      user_id: userData.user.id,
    });

    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.replace('/transactions');
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
            <ThemedText type="subtitle">Nuevo movimiento</ThemedText>

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
                {isLoadingCategories ? (
                  <View style={styles.inlineState}>
                    <ActivityIndicator />
                    <ThemedText type="small" themeColor="textSecondary">
                      Cargando categorías...
                    </ThemedText>
                  </View>
                ) : filteredCategories.length > 0 ? (
                  <View style={styles.categoryList}>
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
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    No hay categorías para este tipo. Se guardará sin categoría.
                  </ThemedText>
                )}
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
                <ThemedText accessibilityLiveRegion="polite" type="smallBold" style={styles.errorText}>
                  {message}
                </ThemedText>
              ) : null}

              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (pressed || isSubmitting) && styles.buttonPressed,
                ]}>
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <ThemedText type="smallBold" style={styles.primaryButtonText}>
                    Guardar movimiento
                  </ThemedText>
                )}
              </Pressable>
            </View>
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
    minHeight: 40,
    justifyContent: 'center',
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
  inlineState: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
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
  buttonPressed: {
    opacity: 0.75,
  },
});
