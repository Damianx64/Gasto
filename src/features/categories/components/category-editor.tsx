import { useEffect, useState } from 'react';
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
import type { TransactionType } from '@/features/transactions/types';
import { getErrorMessage } from '@/lib/errors';

import { createCategory, getCategory, updateCategory } from '../categories.api';
import { CATEGORY_COLORS } from '../constants';

type CategoryEditorProps = {
  categoryId?: string;
};

export function CategoryEditor({ categoryId }: CategoryEditorProps) {
  const isEditing = Boolean(categoryId);
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [color, setColor] = useState<string>(CATEGORY_COLORS[0]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadCategory() {
      setMessage('');
      setIsLoading(true);

      try {
        const category = await getCategory(categoryId!);
        setName(category.name);
        setType(category.type);
        setColor(category.color ?? CATEGORY_COLORS[0]);
      } catch (error) {
        setMessage(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    }

    if (categoryId) {
      loadCategory();
    }
  }, [categoryId]);

  async function handleSubmit() {
    setMessage('');

    const trimmedName = name.trim();

    if (!trimmedName) {
      setMessage('Escribe el nombre de la categoría.');
      return;
    }

    setIsSubmitting(true);

    try {
      const input = { color, name: trimmedName, type };

      if (categoryId) {
        await updateCategory(categoryId, input);
      } else {
        await createCategory(input);
      }

      router.back();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
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
              {isEditing ? 'Editar categoría' : 'Nueva categoría'}
            </ThemedText>

            {isLoading ? (
              <View style={styles.stateContainer}>
                <ActivityIndicator />
                <ThemedText type="small" themeColor="textSecondary">
                  Cargando categoría...
                </ThemedText>
              </View>
            ) : (
              <View style={styles.form}>
                <View style={styles.field}>
                  <ThemedText type="smallBold">Nombre</ThemedText>
                  <TextInput
                    autoCapitalize="words"
                    onChangeText={setName}
                    placeholder="Comida, transporte, sueldo..."
                    placeholderTextColor="#9ca3af"
                    style={styles.input}
                    value={name}
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
                  <ThemedText type="smallBold">Color</ThemedText>
                  <View style={styles.colorList}>
                    {CATEGORY_COLORS.map((option) => (
                      <Pressable
                        accessibilityLabel={`Color ${option}`}
                        accessibilityRole="button"
                        key={option}
                        onPress={() => setColor(option)}
                        style={({ pressed }) => [
                          styles.colorButton,
                          { backgroundColor: option },
                          color === option && styles.colorButtonActive,
                          pressed && styles.buttonPressed,
                        ]}
                      />
                    ))}
                  </View>
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
                      {isEditing ? 'Guardar cambios' : 'Guardar categoría'}
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
  colorList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  colorButton: {
    borderColor: 'transparent',
    borderRadius: 18,
    borderWidth: 3,
    height: 36,
    width: 36,
  },
  colorButtonActive: {
    borderColor: '#111827',
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
