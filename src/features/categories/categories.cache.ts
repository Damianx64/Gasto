import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCurrentSession } from '@/features/auth/auth.api';
import { supabase } from '@/lib/supabase';

import type { Category } from './types';

type ListCategoriesOptions = {
  forceRefresh?: boolean;
};

const categoryCache = new Map<string, Category[]>();
const invalidatedCategoryCaches = new Set<string>();

function getCategoryCacheKey(userId: string) {
  return `categories:${userId}`;
}

async function getCachedCategories(userId: string) {
  if (invalidatedCategoryCaches.has(userId)) return null;

  const memoryCache = categoryCache.get(userId);

  if (memoryCache) return memoryCache;

  try {
    const storedCache = await AsyncStorage.getItem(getCategoryCacheKey(userId));

    if (!storedCache) return null;

    const parsedCache: unknown = JSON.parse(storedCache);

    if (!Array.isArray(parsedCache)) {
      await AsyncStorage.removeItem(getCategoryCacheKey(userId));
      return null;
    }

    const categories = parsedCache as Category[];
    categoryCache.set(userId, categories);
    return categories;
  } catch {
    return null;
  }
}

async function saveCategoriesCache(userId: string, categories: Category[]) {
  categoryCache.set(userId, categories);
  invalidatedCategoryCaches.delete(userId);

  try {
    await AsyncStorage.setItem(getCategoryCacheKey(userId), JSON.stringify(categories));
  } catch {
    // La caché en memoria sigue disponible aunque falle el almacenamiento persistente.
  }
}

async function clearCategoriesCache(userId: string) {
  categoryCache.delete(userId);
  invalidatedCategoryCaches.add(userId);

  try {
    await AsyncStorage.removeItem(getCategoryCacheKey(userId));
  } catch {
    // La siguiente lectura consultará al servidor porque la caché en memoria ya se eliminó.
  }
}

async function fetchCategories(userId: string) {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, type, color, icon_key')
    .eq('user_id', userId)
    .order('type', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;

  const categories = (data ?? []) as Category[];
  await saveCategoriesCache(userId, categories);
  return categories;
}

async function getCurrentSessionUserId() {
  const session = await getCurrentSession();

  if (!session) throw new Error('No se encontró una sesión activa.');
  return session.user.id;
}

export async function refreshCategoriesCache(userId: string) {
  await clearCategoriesCache(userId);

  try {
    await fetchCategories(userId);
  } catch {
    // La mutación ya fue exitosa. Se reintentará al volver a consultar la lista.
  }
}

export async function listCategories({ forceRefresh = false }: ListCategoriesOptions = {}) {
  const userId = await getCurrentSessionUserId();

  if (!forceRefresh) {
    const cachedCategories = await getCachedCategories(userId);

    if (cachedCategories) return cachedCategories;
  }

  return fetchCategories(userId);
}

export async function getCategory(categoryId: string) {
  const categories = await listCategories();
  const category = categories.find((currentCategory) => currentCategory.id === categoryId);

  if (!category) throw new Error('No se encontró la categoría.');
  return category;
}
