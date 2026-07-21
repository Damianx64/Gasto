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
import { StyleSheet, useColorScheme, View } from 'react-native';

import { useAuthSession } from '@/features/auth/use-auth-session';
import { FirstSyncScreen } from '@/features/offline/components/first-sync-screen';
import { SyncProvider, useSync } from '@/features/offline/sync-context';

type RootNavigatorProps = {
  isAuthenticated: boolean;
  isSessionReady: boolean;
};

function RootNavigator({ isAuthenticated, isSessionReady }: RootNavigatorProps) {
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const { isBootstrapped, requiresReauthentication } = useSync();
  const canUseAuthenticatedRoutes = isAuthenticated && !requiresReauthentication;

  useEffect(() => {
    if (!navigationState?.key || !isSessionReady) {
      return;
    }

    const isAuthRoute = segments[0] === '(auth)';

    if (!canUseAuthenticatedRoutes && !isAuthRoute) {
      router.replace('/login');
      return;
    }

    if (canUseAuthenticatedRoutes && isAuthRoute) {
      router.replace('/');
    }
  }, [canUseAuthenticatedRoutes, isSessionReady, navigationState?.key, segments]);

  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="transaction" />
        <Stack.Screen name="category" />
      </Stack>
      {canUseAuthenticatedRoutes && !isBootstrapped ? (
        <View style={styles.gate}>
          <FirstSyncScreen />
        </View>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isSessionReady, offlineAccount, session } = useAuthSession();
  const userId = session?.user.id ?? offlineAccount?.userId ?? null;
  const isAuthenticated = Boolean(userId);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SyncProvider remoteSessionToken={session?.access_token ?? null} userId={userId}>
        <RootNavigator isAuthenticated={isAuthenticated} isSessionReady={isSessionReady} />
      </SyncProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gate: {
    ...StyleSheet.absoluteFill,
    zIndex: 200,
  },
});
