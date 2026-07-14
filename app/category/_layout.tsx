import { Stack } from 'expo-router';

export default function CategoryLayout() {
  return (
    <Stack>
      <Stack.Screen name="new" options={{ title: 'Nueva categoría' }} />
      <Stack.Screen name="[id]" options={{ title: 'Editar categoría' }} />
    </Stack>
  );
}
