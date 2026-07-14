import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
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

const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#000000'];

export default function EditCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [color, setColor] = useState(colors[0]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadCategory() {
      setMessage('');
      setIsLoading(true);

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        setMessage(userError?.message ?? 'No se encontró una sesión activa.');
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('categories')
        .select('name, type, color')
        .eq('id', id)
        .eq('user_id', userData.user.id)
        .single();

      if (error) {
        setMessage(error.message);
        setIsLoading(false);
        return;
      }

      setName(data.name);
      setType(data.type as TransactionType);
      setColor(data.color ?? colors[0]);
      setIsLoading(false);
    }

    if (id) {
      loadCategory();
    }
  }, [id]);

  async function handleSubmit() {
    setMessage('');

    const trimmedName = name.trim();

    if (!trimmedName) {
      setMessage('Escribe el nombre de la categoría.');
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
      .from('categories')
      .update({
        color,
        name: trimmedName,
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
            <ThemedText type="subtitle">Editar categoría</ThemedText>

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
                    {colors.map((option) => (
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
                      Guardar cambios
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
