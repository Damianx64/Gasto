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

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { getErrorMessage } from '@/lib/errors';

import { createCategory, getCategory, updateCategory } from '../categories.api';
import type { CategoryType } from '../types';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS_BY_TYPE,
  isCategoryIconKeyForType,
  type CategoryIconKey,
} from '../constants';
import { CategoryIcon } from './category-icon';
import { CustomColorPickerModal } from './custom-color-picker-modal';

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
  olivePale: '#E5E7DB',
  surface: '#FEFCF7',
  white: '#FFFDF8',
} as const;

const decorations = {
  branch: require('../../../../assets/decorations/hojas_icono.webp'),
  flower: require('../../../../assets/decorations/flores_vertical_2.webp'),
  header: require('../../../../assets/decorations/hojas_horizontal_1.webp'),
  leaves: require('../../../../assets/decorations/planta_vertical_1.webp'),
};

type CategoryEditorProps = {
  categoryId?: string;
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

function getCustomColorCheckTint(color: string) {
  const hex = color.replace('#', '').slice(0, 6);
  if (!/^[\dA-F]{6}$/i.test(hex)) return palette.white;

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  return brightness > 160 ? palette.ink : palette.white;
}

export function CategoryEditor({ categoryId }: CategoryEditorProps) {
  const isEditing = Boolean(categoryId);
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('expense');
  const [color, setColor] = useState<string>(CATEGORY_COLORS[0]);
  const [iconKey, setIconKey] = useState<CategoryIconKey | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isColorPickerVisible, setIsColorPickerVisible] = useState(false);

  const isCustomColor = !CATEGORY_COLORS.some(
    (option) => option.toLowerCase() === color.toLowerCase(),
  );
  const categoryIcons = CATEGORY_ICONS_BY_TYPE[type];

  function handleTypeChange(nextType: CategoryType) {
    setType(nextType);
    setIconKey((currentIconKey) =>
      isCategoryIconKeyForType(currentIconKey, nextType) ? currentIconKey : null,
    );
  }

  useEffect(() => {
    async function loadCategory() {
      setMessage('');
      setIsLoading(true);

      try {
        const category = await getCategory(categoryId!);
        setName(category.name);
        setType(category.type);
        setColor(category.color ?? CATEGORY_COLORS[0]);
        setIconKey(
          isCategoryIconKeyForType(category.icon_key, category.type) ? category.icon_key : null,
        );
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

    if (!iconKey) {
      setMessage('Selecciona un icono para la categoría.');
      return;
    }

    setIsSubmitting(true);

    try {
      const input = { color, iconKey, name: trimmedName, type };

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
                <View style={styles.stateContainer}>
                  <ActivityIndicator color={palette.olive} />
                  <EditorText type="small" themeColor="textSecondary">
                    Cargando categoría...
                  </EditorText>
                </View>
              ) : (
                <View style={styles.form}>
                  <View style={styles.field}>
                    <EditorText style={styles.fieldLabel}>Nombre</EditorText>
                    <View style={styles.inputShell}>
                      <TextInput
                        autoCapitalize="words"
                        onChangeText={setName}
                        placeholder={
                          type === 'expense'
                            ? 'Comida, transporte...'
                            : 'Sueldo, bonos...'
                        }
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
                    <EditorText style={styles.fieldLabel}>Tipo</EditorText>
                    <View style={styles.segment}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: type === 'expense' }}
                        onPress={() => handleTypeChange('expense')}
                        style={({ pressed }) => [
                          styles.segmentButton,
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
                          type === 'income' && styles.incomeSegmentButtonActive,
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
                    <View style={styles.fieldHeading}>
                      <EditorText style={styles.fieldLabel}>Icono</EditorText>
                      <EditorText
                        numberOfLines={1}
                        themeColor="textSecondary"
                        style={styles.fieldHint}>
                        Elige uno
                      </EditorText>
                    </View>
                    <View style={styles.iconList}>
                      {categoryIcons.map((option) => {
                        const isSelected = iconKey === option.key;

                        return (
                          <Pressable
                            accessibilityLabel={`Icono ${option.label}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                            key={option.key}
                            onPress={() => setIconKey(option.key)}
                            style={({ pressed }) => [
                              styles.iconButton,
                              isSelected && [styles.iconButtonActive, { borderColor: color }],
                              pressed && styles.buttonPressed,
                            ]}>
                            <CategoryIcon
                              color={color}
                              iconKey={option.key}
                              size={42}
                              symbolSize={23}
                            />
                            <EditorText numberOfLines={1} style={styles.iconLabel}>
                              {option.label}
                            </EditorText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.field}>
                    <View style={styles.fieldHeading}>
                      <EditorText style={styles.fieldLabel}>Color</EditorText>
                      <EditorText
                        numberOfLines={1}
                        themeColor="textSecondary"
                        style={styles.fieldHint}>
                        Personaliza el icono
                      </EditorText>
                    </View>
                    <View style={styles.colorPanel}>
                      <View style={styles.colorList}>
                        {CATEGORY_COLORS.map((option) => {
                          const isSelected = color.toLowerCase() === option.toLowerCase();

                          return (
                            <Pressable
                              accessibilityLabel={`Color ${option}`}
                              accessibilityRole="button"
                              accessibilityState={{ selected: isSelected }}
                              key={option}
                              onPress={() => setColor(option)}
                              style={({ pressed }) => [
                                styles.colorButton,
                                isSelected && styles.colorButtonActive,
                                pressed && styles.buttonPressed,
                              ]}>
                              <View style={[styles.colorSwatch, { backgroundColor: option }]}>
                                {isSelected ? (
                                  <SymbolView
                                    name={{ android: 'check', ios: 'checkmark', web: 'check' }}
                                    size={20}
                                    tintColor={option === '#D5A83D' ? palette.ink : palette.white}
                                  />
                                ) : null}
                              </View>
                            </Pressable>
                          );
                        })}
                        <Pressable
                          accessibilityHint="Abre el selector de color"
                          accessibilityLabel="Elegir color personalizado"
                          accessibilityRole="button"
                          accessibilityState={{ selected: isCustomColor }}
                          onPress={() => setIsColorPickerVisible(true)}
                          style={({ pressed }) => [
                            styles.colorButton,
                            isCustomColor && styles.colorButtonActive,
                            pressed && styles.buttonPressed,
                          ]}>
                          <View
                            style={[
                              styles.colorSwatch,
                              styles.customColorSwatch,
                              isCustomColor && { backgroundColor: color },
                            ]}>
                            <SymbolView
                              name={
                                isCustomColor
                                  ? { android: 'check', ios: 'checkmark', web: 'check' }
                                  : { android: 'palette', ios: 'paintpalette', web: 'palette' }
                              }
                              size={isCustomColor ? 20 : 22}
                              tintColor={
                                isCustomColor ? getCustomColorCheckTint(color) : palette.oliveDark
                              }
                            />
                          </View>
                        </Pressable>
                      </View>
                      <Image
                        accessible={false}
                        contentFit="contain"
                        pointerEvents="none"
                        source={decorations.flower}
                        style={styles.colorDecoration}
                      />
                    </View>
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
                    disabled={isSubmitting}
                    onPress={handleSubmit}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      (pressed || isSubmitting) && styles.buttonPressed,
                    ]}>
                    {isSubmitting ? (
                      <ActivityIndicator color={palette.white} />
                    ) : (
                      <EditorText style={styles.primaryButtonText}>
                        {isEditing ? 'Guardar cambios' : 'Guardar categoría'}
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
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {isColorPickerVisible ? (
        <CustomColorPickerModal
          color={color}
          onApply={setColor}
          onClose={() => setIsColorPickerVisible(false)}
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
    flexShrink: 0,
    height: 40,
    marginLeft: 6,
    opacity: 0.84,
    transform: [{ rotate: '-9deg' }],
    width: 60,
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
    gap: 7,
  },
  fieldHeading: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: 22,
    fontWeight: '500',
    lineHeight: 28,
  },
  fieldHint: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    textAlign: 'right',
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
  expenseSegmentButtonActive: {
    backgroundColor: palette.expense,
  },
  incomeSegmentButtonActive: {
    backgroundColor: palette.olive,
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
    bottom: -32,
    height: 99,
    opacity: 0.72,
    position: 'absolute',
    width: 42,
  },
  expenseSegmentDecoration: {
    left: -7,
    transform: [{ rotate: '12deg' }],
  },
  incomeSegmentDecoration: {
    right: -5,
    transform: [{ rotate: '-18deg' }, { scaleX: -1 }],
  },
  iconList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 15,
    borderWidth: 1,
    elevation: 1,
    gap: 5,
    justifyContent: 'center',
    minHeight: 82,
    paddingHorizontal: 5,
    paddingVertical: 9,
    shadowColor: '#6D6659',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    width: 78,
  },
  iconButtonActive: {
    backgroundColor: palette.olivePale,
    borderWidth: 2,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  iconLabel: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    maxWidth: '100%',
    textAlign: 'center',
  },
  colorPanel: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 17,
    borderWidth: 1,
    elevation: 2,
    minHeight: 76,
    overflow: 'hidden',
    padding: 12,
    position: 'relative',
    shadowColor: '#6D6659',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  colorList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
    zIndex: 1,
  },
  colorButton: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 24,
    borderWidth: 2,
    flexBasis: '16.666%',
    flexGrow: 0,
    flexShrink: 0,
    height: 48,
    justifyContent: 'center',
  },
  colorButtonActive: {
    borderColor: palette.oliveDark,
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
  colorDecoration: {
    bottom: -39,
    height: 112,
    opacity: 0.55,
    position: 'absolute',
    right: -4,
    transform: [{ rotate: '-16deg' }, { scaleX: -1 }],
    width: 49,
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
    fontWeight: '500',
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
  buttonPressed: {
    opacity: 0.68,
  },
});
