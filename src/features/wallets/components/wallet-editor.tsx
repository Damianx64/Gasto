import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
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
import { Fonts, Spacing } from '@/constants/theme';
import { getErrorMessage } from '@/lib/errors';

import type { WalletType } from '../types';
import { createWallet, getWallet, updateWallet } from '../wallets.api';

const palette = {
  background: '#FBF8F1',
  border: '#E4DAC9',
  debit: '#7D8866',
  ink: '#303A29',
  muted: '#89897F',
  olive: '#617149',
  oliveDark: '#4E5C39',
  surface: '#FEFCF7',
  white: '#FFFDF8',
} as const;

export function WalletEditor({ walletId }: { walletId?: string }) {
  const isEditing = Boolean(walletId);
  const [name, setName] = useState('');
  const [type, setType] = useState<WalletType>('cash');
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!walletId) return;

    setIsLoading(true);
    void getWallet(walletId)
      .then((wallet) => {
        setName(wallet.name);
        setType(wallet.type);
      })
      .catch((error) => setMessage(getErrorMessage(error)))
      .finally(() => setIsLoading(false));
  }, [walletId]);

  async function handleSubmit() {
    const trimmedName = name.trim();
    setMessage('');

    if (!trimmedName) {
      setMessage('Escribe el nombre de la billetera.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (walletId) {
        await updateWallet(walletId, { name: trimmedName, type });
      } else {
        await createWallet({ name: trimmedName, type });
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
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {isLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator color={palette.olive} />
                <ThemedText type="small" style={styles.mutedText}>
                  Cargando billetera...
                </ThemedText>
              </View>
            ) : (
              <View style={styles.formCard}>
                <View style={styles.field}>
                  <ThemedText style={styles.label}>Nombre</ThemedText>
                  <TextInput
                    accessibilityLabel="Nombre de la billetera"
                    autoCapitalize="sentences"
                    onChangeText={setName}
                    placeholder="Ej. Efectivo"
                    placeholderTextColor={palette.muted}
                    selectionColor={palette.olive}
                    style={styles.input}
                    value={name}
                  />
                </View>

                <View style={styles.field}>
                  <ThemedText style={styles.label}>Tipo</ThemedText>
                  <View style={styles.typeRow}>
                    {([
                      { label: 'Efectivo', value: 'cash' as const },
                      { label: 'Débito', value: 'debit' as const },
                    ]).map((option) => {
                      const selected = option.value === type;
                      return (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          key={option.value}
                          onPress={() => setType(option.value)}
                          style={({ pressed }) => [
                            styles.typeButton,
                            selected && styles.typeButtonSelected,
                            pressed && styles.pressed,
                          ]}>
                          <SymbolView
                            name={
                              option.value === 'cash'
                                ? { android: 'payments', ios: 'banknote', web: 'payments' }
                                : { android: 'credit_card', ios: 'creditcard', web: 'credit_card' }
                            }
                            size={24}
                            tintColor={selected ? palette.white : palette.oliveDark}
                          />
                          <ThemedText style={[styles.typeText, selected && styles.typeTextSelected]}>
                            {option.label}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {message ? (
                  <View style={styles.errorCard}>
                    <ThemedText style={styles.errorText}>{message}</ThemedText>
                  </View>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={handleSubmit}
                  style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
                  {isSubmitting ? (
                    <ActivityIndicator color={palette.white} />
                  ) : (
                    <ThemedText style={styles.saveButtonText}>
                      {isEditing ? 'Guardar cambios' : 'Crear billetera'}
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
  container: { backgroundColor: palette.background, flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    alignSelf: 'center',
    maxWidth: 560,
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    width: '100%',
  },
  loadingState: { alignItems: 'center', gap: 12, justifyContent: 'center', minHeight: 320 },
  mutedText: { color: palette.muted, fontFamily: Fonts.serif },
  formCard: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: Spacing.four,
    padding: Spacing.four,
  },
  field: { gap: 9 },
  label: { color: palette.ink, fontFamily: Fonts.serif, fontSize: 18 },
  input: {
    backgroundColor: palette.white,
    borderColor: palette.border,
    borderRadius: 16,
    borderWidth: 1,
    color: palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 18,
    minHeight: 56,
    paddingHorizontal: 16,
  },
  typeRow: { flexDirection: 'row', gap: 12 },
  typeButton: {
    alignItems: 'center',
    borderColor: palette.border,
    borderRadius: 17,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    minHeight: 62,
  },
  typeButtonSelected: { backgroundColor: palette.debit, borderColor: palette.oliveDark },
  typeText: { color: palette.ink, fontFamily: Fonts.serif, fontSize: 17 },
  typeTextSelected: { color: palette.white },
  errorCard: { backgroundColor: '#FBEEE8', borderRadius: 14, padding: Spacing.three },
  errorText: { color: '#B65336', fontFamily: Fonts.serif },
  saveButton: {
    alignItems: 'center',
    backgroundColor: palette.oliveDark,
    borderRadius: 18,
    justifyContent: 'center',
    minHeight: 58,
  },
  saveButtonText: { color: palette.white, fontFamily: Fonts.serif, fontSize: 19 },
  pressed: { opacity: 0.68 },
});
