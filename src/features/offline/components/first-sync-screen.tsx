import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';

import { useSync } from '../sync-context';

export function FirstSyncScreen() {
  const { errorMessage, status, syncNow } = useSync();
  const isWorking = status === 'syncing' || status === 'bootstrapping';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.card}>
          {isWorking ? <ActivityIndicator color="#617149" size="large" /> : null}
          <ThemedText style={styles.title}>Prepara tus datos</ThemedText>
          <ThemedText style={styles.description}>
            Conéctate para descargar tus movimientos y categorías por primera vez en este
            dispositivo. Después podrás trabajar sin internet.
          </ThemedText>
          {errorMessage ? <ThemedText style={styles.error}>{errorMessage}</ThemedText> : null}
          <Pressable
            accessibilityRole="button"
            disabled={isWorking}
            onPress={() => void syncNow()}
            style={({ pressed }) => [styles.button, (pressed || isWorking) && styles.pressed]}>
            <ThemedText style={styles.buttonText}>
              {isWorking ? 'Preparando…' : 'Reintentar'}
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FBF8F1',
    flex: 1,
  },
  safeArea: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#FEFCF7',
    borderColor: '#E4DAC9',
    borderRadius: 22,
    borderWidth: 1,
    gap: 16,
    maxWidth: 460,
    padding: Spacing.five,
    width: '100%',
  },
  title: {
    color: '#303A29',
    fontFamily: Fonts.serif,
    fontSize: 30,
    fontWeight: '600',
    textAlign: 'center',
  },
  description: {
    color: '#77756E',
    fontFamily: Fonts.serif,
    fontSize: 17,
    lineHeight: 25,
    textAlign: 'center',
  },
  error: {
    color: '#B65336',
    fontFamily: Fonts.serif,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#617149',
    borderRadius: 17,
    minHeight: 54,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  buttonText: {
    color: '#FFFDF8',
    fontFamily: Fonts.serif,
    fontSize: 18,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
