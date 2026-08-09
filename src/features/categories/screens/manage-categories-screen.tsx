import { useCallback, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { router, type Href, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { useSync } from '@/features/offline/sync-context';
import { getErrorMessage } from '@/lib/errors';

import { deleteCategory, listCategories } from '../categories.api';
import { CategoryIcon } from '../components/category-icon';
import type { Category } from '../types';

const newCategoryHref = '/category/new' as Href;

const palette = {
  background: '#FBF8F1',
  border: '#E4DAC9',
  danger: '#B65336',
  dangerPale: '#F8E3DA',
  ink: '#303A29',
  muted: '#77756E',
  olive: '#7D8866',
  oliveDark: '#4E5C39',
  surface: '#FEFCF7',
  white: '#FFFDF8',
} as const;

const decorations = {
  branch: require('../../../../assets/decorations/hojas_icono.webp'),
  flowers: require('../../../../assets/decorations/flores_vertical_2.webp'),
  leaves: require('../../../../assets/decorations/planta_vertical_1.webp'),
};

function SettingsText({ style, themeColor, ...props }: ThemedTextProps) {
  return (
    <ThemedText
      {...props}
      style={[
        styles.settingsText,
        themeColor === 'textSecondary' && styles.secondaryText,
        style,
      ]}
    />
  );
}

export default function ManageCategoriesScreen() {
  const { revision } = useSync();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryError, setCategoryError] = useState('');
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [deletingCategoryId, setDeletingCategoryId] = useState('');
  const hasLoadedCategoriesRef = useRef(false);

  const loadCategories = useCallback(async (mode: 'initial' | 'silent') => {
    setCategoryError('');

    if (mode === 'initial') setIsLoadingCategories(true);

    try {
      setCategories(await listCategories());
      hasLoadedCategoriesRef.current = true;
    } catch (error) {
      setCategoryError(getErrorMessage(error));
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCategories(hasLoadedCategoriesRef.current ? 'silent' : 'initial');
    }, [loadCategories, revision]),
  );

  async function handleDeleteCategory(category: Category) {
    setCategoryError('');
    setDeletingCategoryId(category.id);

    try {
      await deleteCategory(category.id);
      setCategories((currentCategories) =>
        currentCategories.filter((currentCategory) => currentCategory.id !== category.id),
      );
    } catch (error) {
      setCategoryError(getErrorMessage(error));
    } finally {
      setDeletingCategoryId('');
    }
  }

  function confirmDeleteCategory(category: Category) {
    Alert.alert(
      'Eliminar categoría',
      `Se eliminará "${category.name}" y sus movimientos quedarán sin categoría.`,
      [
        { style: 'cancel', text: 'Cancelar' },
        {
          onPress: () => handleDeleteCategory(category),
          style: 'destructive',
          text: 'Eliminar',
        },
      ],
    );
  }

  function openEditCategory(categoryId: string) {
    router.push({ pathname: '/category/[id]', params: { id: categoryId } } as Href);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.sectionHeader}>
              <View style={styles.headerCopy}>
                <SettingsText style={styles.title}>Categorías</SettingsText>
                <SettingsText type="small" themeColor="textSecondary" style={styles.subtitle}>
                  Organiza tus movimientos por ingreso o gasto.
                </SettingsText>
              </View>
              <View style={styles.addButtonWrap}>
                <Image
                  accessible={false}
                  contentFit="contain"
                  pointerEvents="none"
                  source={decorations.branch}
                  style={styles.addButtonDecoration}
                />
                <Pressable
                  accessibilityLabel="Añadir categoría"
                  accessibilityRole="button"
                  onPress={() => router.push(newCategoryHref)}
                  style={({ pressed }) => [styles.addButton, pressed && styles.buttonPressed]}>
                  <SettingsText style={styles.addButtonText}>Añadir</SettingsText>
                </Pressable>
              </View>
            </View>

            {categoryError ? (
              <View style={styles.errorCard}>
                <SettingsText
                  accessibilityLiveRegion="polite"
                  style={styles.errorText}>
                  {categoryError}
                </SettingsText>
              </View>
            ) : null}

            {isLoadingCategories ? (
              <View style={styles.stateCard}>
                <ActivityIndicator color={palette.olive} />
                <SettingsText type="small" themeColor="textSecondary">
                  Cargando categorías...
                </SettingsText>
              </View>
            ) : categories.length === 0 ? (
              <View style={styles.stateCard}>
                <CategoryIcon
                  backgroundColor={palette.olive}
                  iconKey="other"
                  size={52}
                  symbolSize={27}
                />
                <SettingsText style={styles.emptyTitle}>Aún no hay categorías</SettingsText>
                <SettingsText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  Crea una para organizar tus próximos movimientos.
                </SettingsText>
              </View>
            ) : (
              <View style={styles.categoryList}>
                {categories.map((category, index) => (
                  <View key={category.id} style={styles.categoryItem}>
                    <Image
                      accessible={false}
                      contentFit="contain"
                      pointerEvents="none"
                      source={index % 2 === 0 ? decorations.leaves : decorations.flowers}
                      style={[
                        styles.categoryDecoration,
                        index % 2 === 0
                          ? styles.categoryDecorationLeft
                          : styles.categoryDecorationRight,
                      ]}
                    />

                    <CategoryIcon
                      color={category.color}
                      iconKey={category.icon_key}
                      size={54}
                      symbolSize={27}
                    />

                    <View style={styles.categoryInfo}>
                      <SettingsText numberOfLines={1} style={styles.categoryName}>
                        {category.name}
                      </SettingsText>
                      <SettingsText
                        numberOfLines={1}
                        themeColor="textSecondary"
                        style={styles.categoryType}>
                        {category.type === 'income' ? 'Ingreso' : 'Gasto'}
                      </SettingsText>
                    </View>

                    <Pressable
                      accessibilityLabel={`Editar categoría ${category.name}`}
                      accessibilityRole="button"
                      onPress={() => openEditCategory(category.id)}
                      style={({ pressed }) => [
                        styles.editButton,
                        pressed && styles.buttonPressed,
                      ]}>
                      <SymbolView
                        name={{ android: 'edit', ios: 'pencil', web: 'edit' }}
                        size={25}
                        tintColor={palette.oliveDark}
                      />
                    </Pressable>

                    <Pressable
                      accessibilityLabel={`Eliminar categoría ${category.name}`}
                      accessibilityRole="button"
                      disabled={deletingCategoryId === category.id}
                      onPress={() => confirmDeleteCategory(category)}
                      style={({ pressed }) => [
                        styles.deleteButton,
                        (pressed || deletingCategoryId === category.id) && styles.buttonPressed,
                      ]}>
                      {deletingCategoryId === category.id ? (
                        <ActivityIndicator color={palette.danger} size="small" />
                      ) : (
                        <SymbolView
                          name={{ android: 'delete', ios: 'trash', web: 'delete' }}
                          size={24}
                          tintColor={palette.danger}
                        />
                      )}
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

          </View>
        </ScrollView>
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
  scrollContent: {
    paddingBottom: Spacing.six,
  },
  content: {
    alignSelf: 'center',
    gap: 18,
    maxWidth: 560,
    paddingHorizontal: Spacing.three,
    paddingTop: 10,
    width: '100%',
  },
  settingsText: {
    color: palette.ink,
    fontFamily: Fonts.serif,
  },
  secondaryText: {
    color: palette.muted,
  },
  title: {
    fontSize: 36,
    fontWeight: '500',
    letterSpacing: -0.6,
    lineHeight: 43,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'space-between',
    minHeight: 64,
  },
  headerCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
  },
  addButtonWrap: {
    justifyContent: 'center',
    minHeight: 64,
    paddingRight: 8,
    position: 'relative',
  },
  addButtonDecoration: {
    height: 92,
    opacity: 0.82,
    position: 'absolute',
    right: -4,
    top: -29,
    transform: [{ rotate: '28deg' }],
    width: 35,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: palette.olive,
    borderColor: '#717B5D',
    borderRadius: 17,
    borderWidth: 1,
    elevation: 3,
    justifyContent: 'center',
    minHeight: 52,
    minWidth: 100,
    paddingHorizontal: 20,
    shadowColor: '#4D503E',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 7,
  },
  addButtonText: {
    color: palette.white,
    fontSize: 19,
    fontWeight: '500',
    lineHeight: 25,
  },
  categoryList: {
    gap: 14,
  },
  categoryItem: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 19,
    borderWidth: 1,
    elevation: 3,
    flexDirection: 'row',
    gap: 11,
    minHeight: 102,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 18,
    position: 'relative',
    shadowColor: '#6D6659',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.11,
    shadowRadius: 9,
  },
  categoryDecoration: {
    height: 112,
    opacity: 0.58,
    position: 'absolute',
    width: 49,
  },
  categoryDecorationLeft: {
    bottom: -24,
    left: -8,
    transform: [{ rotate: '17deg' }],
  },
  categoryDecorationRight: {
    bottom: -25,
    right: -5,
    transform: [{ rotate: '-17deg' }, { scaleX: -1 }],
  },
  categoryInfo: {
    flex: 1,
    minWidth: 0,
    zIndex: 1,
  },
  categoryName: {
    fontSize: 20,
    fontWeight: '500',
    letterSpacing: -0.25,
    lineHeight: 28,
  },
  categoryType: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 23,
  },
  editButton: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 15,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    width: 45,
    zIndex: 1,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: palette.dangerPale,
    borderRadius: 15,
    height: 54,
    justifyContent: 'center',
    width: 52,
    zIndex: 1,
  },
  stateCard: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 19,
    borderWidth: 1,
    elevation: 2,
    gap: 10,
    justifyContent: 'center',
    minHeight: 180,
    padding: Spacing.four,
    shadowColor: '#6D6659',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  emptyTitle: {
    fontSize: 21,
    fontWeight: '500',
    lineHeight: 27,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: '#FBEEE8',
    borderColor: '#EAC7B9',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
  },
  errorText: {
    color: palette.danger,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
  },
  buttonPressed: {
    opacity: 0.68,
  },
});
