import { Stack } from 'expo-router';

import { Fonts } from '@/constants/theme';

export default function WalletLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: '#FBF8F1' },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#FBF8F1' },
        headerTintColor: '#303A29',
        headerTitleStyle: { fontFamily: Fonts.serif, fontSize: 22, fontWeight: '500' },
      }}>
      <Stack.Screen name="index" options={{ title: 'Billeteras' }} />
      <Stack.Screen name="new" options={{ title: 'Nueva billetera' }} />
      <Stack.Screen name="[id]" options={{ title: 'Editar billetera' }} />
    </Stack>
  );
}
