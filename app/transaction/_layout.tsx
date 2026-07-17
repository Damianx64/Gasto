import { Stack } from 'expo-router';

import { Fonts } from '@/constants/theme';

const palette = {
  background: '#FBF8F1',
  ink: '#303A29',
} as const;

export default function TransactionLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: palette.background },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: palette.background },
        headerTintColor: palette.ink,
        headerTitleStyle: {
          fontFamily: Fonts.serif,
          fontSize: 22,
          fontWeight: '500',
        },
      }}>
      <Stack.Screen name="new" options={{ title: 'Nuevo movimiento' }} />
      <Stack.Screen name="[id]" options={{ title: 'Editar movimiento' }} />
    </Stack>
  );
}
