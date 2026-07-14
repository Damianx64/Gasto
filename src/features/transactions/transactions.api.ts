import { requireCurrentUserId } from '@/features/auth/auth.api';
import { listCategories } from '@/features/categories/categories.api';
import { supabase } from '@/lib/supabase';

import type { TransactionDetails, TransactionInput, TransactionListItem } from './types';

export async function listTransactions() {
  const userId = await requireCurrentUserId();
  const { data, error } = await supabase
    .from('transactions')
    .select('id, amount, type, description, transaction_date, categories(name, color)')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as TransactionListItem[];
}

export async function getTransactionEditorData(transactionId: string) {
  const userId = await requireCurrentUserId();
  const [categories, transactionResponse] = await Promise.all([
    listCategories(),
    supabase
      .from('transactions')
      .select('amount, category_id, description, transaction_date, type')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .single(),
  ]);

  if (transactionResponse.error) throw transactionResponse.error;

  return {
    categories,
    transaction: transactionResponse.data as TransactionDetails,
  };
}

export async function createTransaction(input: TransactionInput) {
  const userId = await requireCurrentUserId();
  const { error } = await supabase.from('transactions').insert({
    amount: input.amount,
    category_id: input.categoryId || null,
    description: input.description || null,
    transaction_date: input.transactionDate,
    type: input.type,
    user_id: userId,
  });

  if (error) throw error;
}

export async function updateTransaction(transactionId: string, input: TransactionInput) {
  const userId = await requireCurrentUserId();
  const { error } = await supabase
    .from('transactions')
    .update({
      amount: input.amount,
      category_id: input.categoryId || null,
      description: input.description || null,
      transaction_date: input.transactionDate,
      type: input.type,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transactionId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function deleteTransaction(transactionId: string) {
  const userId = await requireCurrentUserId();
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId)
    .eq('user_id', userId);

  if (error) throw error;
}
