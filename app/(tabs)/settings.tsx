import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, type Href, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const newCategoryHref = '/category/new' as Href;

type TransactionType = 'income' | 'expense';

type Category = {
  id: string;
  name: string;
  type: TransactionType;
  color: string | null;
};

export default function SettingsScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [deletingCategoryId, setDeletingCategoryId] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);

  const loadCategories = useCallback(async () => {
    setCategoryError('');
    setIsLoadingCategories(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setCategoryError(userError?.message ?? 'No se encontró una sesión activa.');
      setIsLoadingCategories(false);
      return;
    }

    const { data, error } = await supabase
      .from('categories')
      .select('id, name, type, color')
      .eq('user_id', userData.user.id)
      .order('type', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      setCategoryError(error.message);
      setIsLoadingCategories(false);
      return;
    }

    setCategories((data ?? []) as Category[]);
    setIsLoadingCategories(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [loadCategories]),
  );

  async function handleDeleteCategory(category: Category) {
    setCategoryError('');
    setDeletingCategoryId(category.id);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setCategoryError(userError?.message ?? 'No se encontró una sesión activa.');
      setDeletingCategoryId('');
      return;
    }

    const { error: transactionsError } = await supabase
      .from('transactions')
      .update({ category_id: null })
      .eq('user_id', userData.user.id)
      .eq('category_id', category.id);

    if (transactionsError) {
      setCategoryError(transactionsError.message);
      setDeletingCategoryId('');
      return;
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', category.id)
      .eq('user_id', userData.user.id);

    if (error) {
      setCategoryError(error.message);
      setDeletingCategoryId('');
      return;
    }

    setCategories((currentCategories) =>
      currentCategories.filter((currentCategory) => currentCategory.id !== category.id),
    );
    setDeletingCategoryId('');
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

    const { error } = await supabase.auth.signOut();

    setIsSigningOut(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.replace('/login');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="subtitle">Ajustes</ThemedText>

          {message ? <ThemedText type="small">{message}</ThemedText> : null}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold">Categorías</ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(newCategoryHref)}
                style={({ pressed }) => [styles.smallButton, pressed && styles.buttonMuted]}>
                <ThemedText type="smallBold" style={styles.buttonText}>
                  Añadir
                </ThemedText>
              </Pressable>
            </View>

            {categoryError ? (
              <ThemedText type="smallBold" style={styles.errorText}>
                {categoryError}
              </ThemedText>
            ) : null}

            {isLoadingCategories ? (
              <View style={styles.inlineState}>
                <ActivityIndicator />
                <ThemedText type="small" themeColor="textSecondary">
                  Cargando categorías...
                </ThemedText>
              </View>
            ) : categories.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Aún no hay categorías.
              </ThemedText>
            ) : (
              <View style={styles.categoryList}>
                {categories.map((category) => (
                  <View key={category.id} style={styles.categoryItem}>
                    <View
                      style={[
                        styles.categoryColor,
                        { backgroundColor: category.color ?? '#9ca3af' },
                      ]}
                    />
                    <View style={styles.categoryInfo}>
                      <ThemedText type="smallBold">{category.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {category.type === 'income' ? 'Ingreso' : 'Gasto'}
                      </ThemedText>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => openEditCategory(category.id)}
                      style={({ pressed }) => [styles.actionButton, pressed && styles.buttonMuted]}>
                      <ThemedText type="smallBold">Editar</ThemedText>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={deletingCategoryId === category.id}
                      onPress={() => confirmDeleteCategory(category)}
                      style={({ pressed }) => [
                        styles.deleteButton,
                        (pressed || deletingCategoryId === category.id) && styles.buttonMuted,
                      ]}>
                      {deletingCategoryId === category.id ? (
                        <ActivityIndicator size="small" />
                      ) : (
                        <ThemedText type="smallBold" style={styles.deleteButtonText}>
                          Eliminar
                        </ThemedText>
                      )}
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          <Pressable
            disabled={isSigningOut}
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.signOutButton,
              (pressed || isSigningOut) && styles.buttonMuted,
            ]}>
            {isSigningOut ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText type="smallBold" style={styles.buttonText}>
                Cerrar sesion
              </ThemedText>
            )}
          </Pressable>
        </ScrollView>
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
  },
  scrollContent: {
    gap: Spacing.three,
    padding: Spacing.four,
  },
  section: {
    gap: Spacing.three,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signOutButton: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  buttonMuted: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
  },
  smallButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  inlineState: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  categoryList: {
    gap: Spacing.two,
  },
  categoryItem: {
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  categoryColor: {
    borderRadius: 8,
    height: 16,
    width: 16,
  },
  categoryInfo: {
    flex: 1,
  },
  actionButton: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  deleteButtonText: {
    color: '#dc2626',
  },
  errorText: {
    color: '#dc2626',
  },
});
