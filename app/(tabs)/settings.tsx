import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { router, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const newCategoryHref = '/category/new' as Href;

export default function SettingsScreen() {
  const [message, setMessage] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setMessage('');
    setIsSigningOut(true);

    const { error } = await supabase.auth.signOut();

    setIsSigningOut(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.replace('/login');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Ajustes</ThemedText>

        {message ? <ThemedText type="small">{message}</ThemedText> : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(newCategoryHref)}
          style={({ pressed }) => [styles.categoryButton, pressed && styles.buttonMuted]}>
          <ThemedText type="smallBold" style={styles.categoryButtonText}>
            Añadir categoría
          </ThemedText>
        </Pressable>

        <Pressable
          disabled={isSigningOut}
          onPress={handleSignOut}
          style={({ pressed }) => [styles.button, (pressed || isSigningOut) && styles.buttonMuted]}>
          {isSigningOut ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <ThemedText type="smallBold" style={styles.buttonText}>
              Cerrar sesion
            </ThemedText>
          )}
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  buttonMuted: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
  },
  categoryButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  categoryButtonText: {
    color: '#ffffff',
  },
});
