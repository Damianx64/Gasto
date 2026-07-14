import { Stack } from 'expo-router';

export default function TransactionLayout() {
  return (
    <Stack>
      <Stack.Screen name="new" options={{ title: 'Nuevo movimiento' }} />
      <Stack.Screen name="[id]" options={{ title: 'Editar movimiento' }} />
    </Stack>
  );
}
