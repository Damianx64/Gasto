import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCurrentSession } from '@/features/auth/auth.api';
import { supabase } from '@/lib/supabase';

import type { TransactionListItem } from './types';

export type ListTransactionsOptions = {
  forceRefresh?: boolean;
};

const transactionCache = new Map<string, TransactionListItem[]>();
const invalidatedTransactionCaches = new Set<string>();

function getTransactionCacheKey(userId: string) {
  return `transactions:${userId}`;
}

async function getCachedTransactions(userId: string) {
  if (invalidatedTransactionCaches.has(userId)) return null;

  const memoryCache = transactionCache.get(userId);

  if (memoryCache) return memoryCache;

  try {
    const storedCache = await AsyncStorage.getItem(getTransactionCacheKey(userId));

    if (!storedCache) return null;

    const parsedCache: unknown = JSON.parse(storedCache);

    if (!Array.isArray(parsedCache)) {
      await AsyncStorage.removeItem(getTransactionCacheKey(userId));
      return null;
    }

    const transactions = parsedCache as TransactionListItem[];
    transactionCache.set(userId, transactions);
    return transactions;
  } catch {
    return null;
  }
}

async function saveTransactionsCache(userId: string, transactions: TransactionListItem[]) {
  transactionCache.set(userId, transactions);
  invalidatedTransactionCaches.delete(userId);

  try {
    await AsyncStorage.setItem(getTransactionCacheKey(userId), JSON.stringify(transactions));
  } catch {
    // La caché en memoria sigue disponible aunque falle el almacenamiento persistente.
  }
}

async function clearTransactionsCache(userId: string) {
  transactionCache.delete(userId);
  invalidatedTransactionCaches.add(userId);

  try {
    await AsyncStorage.removeItem(getTransactionCacheKey(userId));
  } catch {
    // La siguiente lectura consultará al servidor porque la caché en memoria ya se eliminó.
  }
}

async function fetchTransactions(userId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, amount, type, description, transaction_date, categories(name, color)')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;

  const transactions = (data ?? []) as TransactionListItem[];
  await saveTransactionsCache(userId, transactions);
  return transactions;
}

export async function refreshTransactionsCache(userId: string) {
  await clearTransactionsCache(userId);

  try {
    await fetchTransactions(userId);
  } catch {
    // La mutación ya fue exitosa. Se reintentará al volver a consultar la lista.
  }
}

async function getCurrentSessionUserId() {
  const session = await getCurrentSession();

  if (!session) throw new Error('No se encontró una sesión activa.');
  return session.user.id;
}

export async function listTransactions({ forceRefresh = false }: ListTransactionsOptions = {}) {
  const userId = await getCurrentSessionUserId();

  if (!forceRefresh) {
    const cachedTransactions = await getCachedTransactions(userId);

    if (cachedTransactions) return cachedTransactions;
  }

  return fetchTransactions(userId);
}
