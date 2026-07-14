import { requireCurrentUserId } from '@/features/auth/auth.api';
import { supabase } from '@/lib/supabase';

import type { Category, CategoryInput } from './types';

export async function listCategories() {
  const userId = await requireCurrentUserId();
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, type, color')
    .eq('user_id', userId)
    .order('type', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function getCategory(categoryId: string) {
  const userId = await requireCurrentUserId();
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, type, color')
    .eq('id', categoryId)
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data as Category;
}

export async function createCategory(input: CategoryInput) {
  const userId = await requireCurrentUserId();
  const now = new Date().toISOString();
  const { error } = await supabase.from('categories').insert({
    color: input.color,
    created_at: now,
    name: input.name,
    type: input.type,
    updated_at: now,
    user_id: userId,
  });

  if (error) throw error;
}

export async function updateCategory(categoryId: string, input: CategoryInput) {
  const userId = await requireCurrentUserId();
  const { error } = await supabase
    .from('categories')
    .update({
      color: input.color,
      name: input.name,
      type: input.type,
      updated_at: new Date().toISOString(),
    })
    .eq('id', categoryId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function deleteCategory(categoryId: string) {
  const userId = await requireCurrentUserId();
  const { error: transactionsError } = await supabase
    .from('transactions')
    .update({ category_id: null })
    .eq('user_id', userId)
    .eq('category_id', categoryId);

  if (transactionsError) throw transactionsError;

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)
    .eq('user_id', userId);

  if (error) throw error;
}
