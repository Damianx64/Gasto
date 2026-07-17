import { useCallback, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { router, type Href, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Fonts, Spacing } from '@/constants/theme';
import { signOut } from '@/features/auth/auth.api';
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
  header: require('../../../../assets/decorations/hojas_horizontal_1.webp'),
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

export default function SettingsScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [deletingCategoryId, setDeletingCategoryId] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);
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
    }, [loadCategories]),
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

  async function handleSignOut() {
    setMessage('');
    setIsSigningOut(true);

    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.titleRow}>
              <SettingsText style={styles.title}>Ajustes</SettingsText>
              <Image
                accessible={false}
                contentFit="contain"
                pointerEvents="none"
                source={decorations.header}
                style={styles.titleDecoration}
              />
            </View>

            <View style={styles.sectionHeader}>
              <SettingsText style={styles.sectionTitle}>Categorías</SettingsText>
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
                        <SettingsText style={styles.deleteButtonText}>Eliminar</SettingsText>
                      )}
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {message ? (
              <View style={styles.errorCard}>
                <SettingsText
                  accessibilityLiveRegion="polite"
                  style={styles.errorText}>
                  {message}
                </SettingsText>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={isSigningOut}
              onPress={handleSignOut}
              style={({ pressed }) => [
                styles.signOutButton,
                (pressed || isSigningOut) && styles.buttonPressed,
              ]}>
              {isSigningOut ? (
                <ActivityIndicator color={palette.white} />
              ) : (
                <SettingsText style={styles.signOutButtonText}>Cerrar sesión</SettingsText>
              )}
              <Image
                accessible={false}
                contentFit="contain"
                pointerEvents="none"
                source={decorations.branch}
                style={styles.signOutDecoration}
              />
            </Pressable>
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
    paddingBottom: BottomTabInset + Spacing.six,
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
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 58,
  },
  title: {
    fontSize: 44,
    fontWeight: '500',
    letterSpacing: -0.9,
    lineHeight: 52,
  },
  titleDecoration: {
    height: 42,
    marginLeft: 7,
    opacity: 0.84,
    transform: [{ rotate: '-9deg' }],
    width: 65,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 64,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '500',
    letterSpacing: -0.4,
    lineHeight: 35,
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
    fontSize: 22,
    fontWeight: '500',
    letterSpacing: -0.25,
    lineHeight: 28,
  },
  categoryType: {
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 23,
  },
  editButton: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 15,
    borderWidth: 1,
    height: 54,
    justifyContent: 'center',
    width: 52,
    zIndex: 1,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: palette.dangerPale,
    borderRadius: 15,
    justifyContent: 'center',
    minHeight: 54,
    minWidth: 88,
    paddingHorizontal: 13,
    zIndex: 1,
  },
  deleteButtonText: {
    color: palette.danger,
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 23,
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
  signOutButton: {
    alignItems: 'center',
    backgroundColor: '#CF5D46',
    borderColor: '#B9513D',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 4,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 62,
    overflow: 'hidden',
    paddingHorizontal: 54,
    position: 'relative',
    shadowColor: '#7D392B',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 9,
  },
  signOutButtonText: {
    color: palette.white,
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 27,
    textAlign: 'center',
    zIndex: 1,
  },
  signOutDecoration: {
    bottom: -29,
    height: 91,
    opacity: 0.65,
    position: 'absolute',
    right: 4,
    transform: [{ rotate: '29deg' }],
    width: 34,
  },
  buttonPressed: {
    opacity: 0.68,
  },
});
