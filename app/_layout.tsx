import { useEffect } from 'react';
import {
  DarkTheme,
  DefaultTheme,
  router,
  Stack,
  ThemeProvider,
  useRootNavigationState,
  useSegments,
} from 'expo-router';
import { useColorScheme } from 'react-native';

import { useAuthSession } from '@/features/auth/use-auth-session';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const { isSessionReady, session } = useAuthSession();

  useEffect(() => {
    if (!navigationState?.key || !isSessionReady) {
      return;
    }

    const isAuthRoute = segments[0] === '(auth)';

    if (!session && !isAuthRoute) {
      router.replace('/login');
      return;
    }

    if (session && isAuthRoute) {
      router.replace('/');
    }
  }, [isSessionReady, navigationState?.key, segments, session]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="transaction" />
        <Stack.Screen name="category" />
      </Stack>
    </ThemeProvider>
  );
}
