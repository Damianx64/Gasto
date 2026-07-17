import {
  createLocalCategory,
  deleteLocalCategory,
  getLocalCategory,
  listLocalCategories,
  updateLocalCategory,
} from '@/features/offline/repository';

import type { CategoryInput } from './types';

export async function listCategories() {
  return listLocalCategories();
}

export async function getCategory(categoryId: string) {
  return getLocalCategory(categoryId);
}

export async function createCategory(input: CategoryInput) {
  return createLocalCategory(input);
}

export async function updateCategory(categoryId: string, input: CategoryInput) {
  return updateLocalCategory(categoryId, input);
}

export async function deleteCategory(categoryId: string) {
  return deleteLocalCategory(categoryId);
}
