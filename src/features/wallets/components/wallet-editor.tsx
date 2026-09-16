import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
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
import { CustomColorPickerModal } from '@/features/categories/components/custom-color-picker-modal';
import { getErrorMessage } from '@/lib/errors';

import {
  DEFAULT_WALLET_COLOR,
  isWalletColorLight,
  normalizeWalletColor,
} from '../constants';
import type { WalletType } from '../types';
import { createWallet, getWallet, updateWallet } from '../wallets.api';

const palette = {
  background: '#FBF8F1',
  border: '#E4DAC9',
  danger: '#B65336',
  dangerPale: '#FBEEE8',
  debit: '#7D8866',
  ink: '#303A29',
  muted: '#89897F',
  olive: '#617149',
  oliveDark: '#4E5C39',
  olivePale: '#E5E7DB',
  surface: '#FEFCF7',
  white: '#FFFDF8',
} as const;

const decorations = {
  branch: require('../../../../assets/decorations/hojas_icono.webp'),
  flower: require('../../../../assets/decorations/flores_vertical_2.webp'),
  leaves: require('../../../../assets/decorations/planta_vertical_1.webp'),
};

export function WalletEditor({ walletId }: { walletId?: string }) {
  const isEditing = Boolean(walletId);
  const [name, setName] = useState('');
  const [type, setType] = useState<WalletType>('cash');
  const [color, setColor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isColorPickerVisible, setIsColorPickerVisible] = useState(false);
  const [message, setMessage] = useState('');
  const displayedColor = color ?? DEFAULT_WALLET_COLOR;

  useEffect(() => {
    if (!walletId) return;

    setIsLoading(true);
    void getWallet(walletId)
      .then((wallet) => {
        setName(wallet.name);
        setType(wallet.type);
        setColor(wallet.color);
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
        await updateWallet(walletId, { color, name: trimmedName, type });
      } else {
        await createWallet({ color, name: trimmedName, type });
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
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}>
          <ScrollView
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              {isLoading ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator color={palette.olive} />
                  <ThemedText type="small" style={styles.mutedText}>
                    Cargando billetera...
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.form}>
                  <View style={styles.field}>
                    <ThemedText style={styles.label}>Nombre</ThemedText>
                    <View style={styles.inputShell}>
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
                            {selected ? (
                              <Image
                                accessible={false}
                                contentFit="contain"
                                pointerEvents="none"
                                source={
                                  option.value === 'cash'
                                    ? decorations.leaves
                                    : decorations.flower
                                }
                                style={[
                                  styles.typeDecoration,
                                  option.value === 'cash'
                                    ? styles.cashDecoration
                                    : styles.debitDecoration,
                                ]}
                              />
                            ) : null}
                            <SymbolView
                              name={
                                option.value === 'cash'
                                  ? { android: 'payments', ios: 'banknote', web: 'payments' }
                                  : { android: 'credit_card', ios: 'creditcard', web: 'credit_card' }
                              }
                              size={24}
                              tintColor={selected ? palette.white : palette.oliveDark}
                            />
                            <ThemedText
                              style={[styles.typeText, selected && styles.typeTextSelected]}>
                              {option.label}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.field}>
                    <ThemedText style={styles.label}>Color</ThemedText>
                    <View style={styles.colorRow}>
                      <Pressable
                        accessibilityLabel="Usar color verde predeterminado"
                        accessibilityRole="button"
                        accessibilityState={{ selected: color === null }}
                        onPress={() => setColor(null)}
                        style={({ pressed }) => [
                          styles.colorButton,
                          color === null && styles.colorButtonSelected,
                          pressed && styles.pressed,
                        ]}>
                        <View
                          style={[
                            styles.colorSwatch,
                            { backgroundColor: DEFAULT_WALLET_COLOR },
                          ]}>
                          {color === null ? (
                            <SymbolView
                              name={{ android: 'check', ios: 'checkmark', web: 'check' }}
                              size={19}
                              tintColor={palette.white}
                            />
                          ) : null}
                        </View>
                        <ThemedText style={styles.colorButtonText}>Predeterminado</ThemedText>
                      </Pressable>

                      <Pressable
                        accessibilityHint="Abre el selector de color"
                        accessibilityLabel="Elegir color personalizado"
                        accessibilityRole="button"
                        accessibilityState={{ selected: color !== null }}
                        onPress={() => setIsColorPickerVisible(true)}
                        style={({ pressed }) => [
                          styles.colorButton,
                          color !== null && styles.colorButtonSelected,
                          pressed && styles.pressed,
                        ]}>
                        <View
                          style={[
                            styles.colorSwatch,
                            color === null
                              ? styles.customColorSwatch
                              : { backgroundColor: displayedColor },
                          ]}>
                          <SymbolView
                            name={
                              color === null
                                ? { android: 'palette', ios: 'paintpalette', web: 'palette' }
                                : { android: 'check', ios: 'checkmark', web: 'check' }
                            }
                            size={color === null ? 21 : 19}
                            tintColor={
                              color === null
                                ? palette.oliveDark
                                : isWalletColorLight(displayedColor)
                                  ? palette.ink
                                  : palette.white
                            }
                          />
                        </View>
                        <ThemedText style={styles.colorButtonText}>Personalizado</ThemedText>
                      </Pressable>
                    </View>
                  </View>

                  {message ? (
                    <View style={styles.errorCard}>
                      <ThemedText accessibilityLiveRegion="polite" style={styles.errorText}>
                        {message}
                      </ThemedText>
                    </View>
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    disabled={isSubmitting}
                    onPress={handleSubmit}
                    style={({ pressed }) => [
                      styles.saveButton,
                      (pressed || isSubmitting) && styles.pressed,
                    ]}>
                    {isSubmitting ? (
                      <ActivityIndicator color={palette.white} />
                    ) : (
                      <ThemedText style={styles.saveButtonText}>
                        {isEditing ? 'Guardar cambios' : 'Guardar billetera'}
                      </ThemedText>
                    )}
                    <Image
                      accessible={false}
                      contentFit="contain"
                      pointerEvents="none"
                      source={decorations.branch}
                      style={styles.buttonDecoration}
                    />
                  </Pressable>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {isColorPickerVisible ? (
        <CustomColorPickerModal
          color={displayedColor}
          onApply={(nextColor) => setColor(normalizeWalletColor(nextColor))}
          onClose={() => setIsColorPickerVisible(false)}
          subtitle="Elige el tono para tu billetera"
        />
      ) : null}
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
  loadingState: {
    alignItems: 'center',
    gap: Spacing.three,
    justifyContent: 'center',
    minHeight: 360,
  },
  mutedText: {
    color: palette.muted,
    fontFamily: Fonts.serif,
  },
  form: {
    gap: 20,
  },
  field: {
    gap: 7,
  },
  label: {
    color: palette.ink,
    fontFamily: Fonts.serif,
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
  inputDecoration: {
    bottom: -24,
    height: 87,
    opacity: 0.8,
    position: 'absolute',
    right: 3,
    transform: [{ rotate: '32deg' }],
    width: 31,
    zIndex: 2,
  },
  typeRow: {
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
  typeButton: {
    alignItems: 'center',
    borderRadius: 13,
    flex: 1,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    minHeight: 54,
    overflow: 'hidden',
    position: 'relative',
  },
  typeButtonSelected: {
    backgroundColor: palette.debit,
  },
  typeDecoration: {
    bottom: -32,
    height: 99,
    opacity: 0.72,
    position: 'absolute',
    width: 42,
  },
  cashDecoration: {
    left: -7,
    transform: [{ rotate: '12deg' }],
  },
  debitDecoration: {
    right: -5,
    transform: [{ rotate: '-18deg' }, { scaleX: -1 }],
  },
  typeText: {
    color: palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 26,
    zIndex: 1,
  },
  typeTextSelected: {
    color: palette.white,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  colorButton: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 17,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 64,
    paddingHorizontal: 13,
  },
  colorButtonSelected: {
    borderColor: palette.oliveDark,
    borderWidth: 2,
  },
  colorSwatch: {
    alignItems: 'center',
    borderColor: palette.white,
    borderRadius: 19,
    borderWidth: 2,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  customColorSwatch: {
    backgroundColor: palette.olivePale,
  },
  colorButtonText: {
    color: palette.ink,
    flexShrink: 1,
    fontFamily: Fonts.serif,
    fontSize: 16,
    fontWeight: '500',
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
    fontFamily: Fonts.serif,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
  saveButton: {
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
  saveButtonText: {
    color: palette.white,
    fontFamily: Fonts.serif,
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
  pressed: {
    opacity: 0.68,
  },
});
