import { useLocalSearchParams } from 'expo-router';

import { CategoryEditor } from '../components/category-editor';

export default function EditCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <CategoryEditor categoryId={id} />;
}
