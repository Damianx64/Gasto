import { useState } from 'react';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Fonts, Spacing } from '@/constants/theme';
import { requireOfflineUserId, signOut } from '@/features/auth/auth.api';
import { clearLocalUserData, getLocalUserState } from '@/features/offline/database';
import { useSync } from '@/features/offline/sync-context';
import { getErrorMessage } from '@/lib/errors';

const palette = {
  background: '#FBF8F1',
  border: '#E4DAC9',
  danger: '#B65336',
  ink: '#303A29',
  muted: '#77756E',
  olive: '#7D8866',
  oliveDark: '#4E5C39',
  surface: '#FEFCF7',
  white: '#FFFDF8',
} as const;

const decorations = {
  branch: require('../../../../assets/decorations/hojas_icono.webp'),
  flowers: require('../../../../assets/decorations/flores_vertical_2.webp'),
  header: require('../../../../assets/decorations/hojas_horizontal_1.webp'),
  leaves: require('../../../../assets/decorations/planta_vertical_1.webp'),
};

function SettingsText({ style, themeColor, ...props }: ThemedTextProps) {
  return (
    <ThemedText
      {...props}
      style={[
        styles.settingsText,
        themeColor === 'textSecondary' && styles.secondaryText,
        style,
      ]}
    />
  );
}

export default function SettingsScreen() {
  const { syncNow } = useSync();
  const [message, setMessage] = useState('');
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setMessage('');
    setIsSigningOut(true);

    try {
      const userId = await requireOfflineUserId();
      if ((await getLocalUserState(userId)).pendingCount > 0) {
        const synchronized = await syncNow();
        const remainingPending = (await getLocalUserState(userId)).pendingCount;
        if (!synchronized || remainingPending > 0) {
          throw new Error(
            'No puedes cerrar sesión mientras haya cambios pendientes. Conéctate y vuelve a intentarlo.',
          );
        }
      }

      await signOut();
      await clearLocalUserData(userId);
      router.replace('/login');
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.titleRow}>
              <SettingsText style={styles.title}>Ajustes</SettingsText>
              <Image
                accessible={false}
                contentFit="contain"
                pointerEvents="none"
                source={decorations.header}
                style={styles.titleDecoration}
              />
            </View>

            <SettingsText type="small" themeColor="textSecondary" style={styles.intro}>
              Administra la forma en que organizas tus movimientos.
            </SettingsText>

            <View style={styles.managementList}>
              <Pressable
                accessibilityHint="Abre la administración de billeteras"
                accessibilityRole="button"
                onPress={() => router.push('/wallet' as Href)}
                style={({ pressed }) => [styles.managementCard, pressed && styles.buttonPressed]}>
                <Image
                  accessible={false}
                  contentFit="contain"
                  pointerEvents="none"
                  source={decorations.leaves}
                  style={[styles.cardDecoration, styles.walletDecoration]}
                />
                <View style={styles.managementIcon}>
                  <SymbolView
                    name={{
                      android: 'account_balance_wallet',
                      ios: 'wallet.pass',
                      web: 'account_balance_wallet',
                    }}
                    size={27}
                    tintColor={palette.white}
                  />
                </View>
                <View style={styles.managementCopy}>
                  <SettingsText style={styles.managementTitle}>Billeteras</SettingsText>
                  <SettingsText type="small" themeColor="textSecondary">
                    Añade, edita o elimina tus billeteras.
                  </SettingsText>
                </View>
                <SymbolView
                  name={{ android: 'chevron_right', ios: 'chevron.right', web: 'chevron_right' }}
                  size={22}
                  tintColor={palette.oliveDark}
                />
              </Pressable>

              <Pressable
                accessibilityHint="Abre la administración de categorías"
                accessibilityRole="button"
                onPress={() => router.push('/category' as Href)}
                style={({ pressed }) => [styles.managementCard, pressed && styles.buttonPressed]}>
                <Image
                  accessible={false}
                  contentFit="contain"
                  pointerEvents="none"
                  source={decorations.flowers}
                  style={[styles.cardDecoration, styles.categoryDecoration]}
                />
                <View style={styles.managementIcon}>
                  <SymbolView
                    name={{ android: 'category', ios: 'tag.fill', web: 'category' }}
                    size={27}
                    tintColor={palette.white}
                  />
                </View>
                <View style={styles.managementCopy}>
                  <SettingsText style={styles.managementTitle}>Categorías</SettingsText>
                  <SettingsText type="small" themeColor="textSecondary">
                    Añade, edita o elimina tus categorías.
                  </SettingsText>
                </View>
                <SymbolView
                  name={{ android: 'chevron_right', ios: 'chevron.right', web: 'chevron_right' }}
                  size={22}
                  tintColor={palette.oliveDark}
                />
              </Pressable>
            </View>

            {message ? (
              <View style={styles.errorCard}>
                <SettingsText accessibilityLiveRegion="polite" style={styles.errorText}>
                  {message}
                </SettingsText>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={isSigningOut}
              onPress={handleSignOut}
              style={({ pressed }) => [
                styles.signOutButton,
                (pressed || isSigningOut) && styles.buttonPressed,
              ]}>
              {isSigningOut ? (
                <ActivityIndicator color={palette.white} />
              ) : (
                <SettingsText style={styles.signOutButtonText}>Cerrar sesión</SettingsText>
              )}
              <Image
                accessible={false}
                contentFit="contain"
                pointerEvents="none"
                source={decorations.branch}
                style={styles.signOutDecoration}
              />
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: palette.background, flex: 1 },
  safeArea: { backgroundColor: palette.background, flex: 1 },
  scrollContent: { paddingBottom: BottomTabInset + Spacing.six },
  content: {
    alignSelf: 'center',
    gap: 18,
    maxWidth: 560,
    paddingHorizontal: Spacing.three,
    paddingTop: 10,
    width: '100%',
  },
  settingsText: { color: palette.ink, fontFamily: Fonts.serif },
  secondaryText: { color: palette.muted },
  titleRow: { alignItems: 'center', flexDirection: 'row', minHeight: 58 },
  title: { fontSize: 44, fontWeight: '500', letterSpacing: -0.9, lineHeight: 52 },
  titleDecoration: {
    height: 42,
    marginLeft: 7,
    opacity: 0.84,
    transform: [{ rotate: '-9deg' }],
    width: 65,
  },
  intro: { fontSize: 16, lineHeight: 22, marginTop: -10 },
  managementList: { gap: 14 },
  managementCard: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 19,
    borderWidth: 1,
    elevation: 3,
    flexDirection: 'row',
    gap: 12,
    minHeight: 102,
    overflow: 'hidden',
    padding: 14,
    position: 'relative',
    shadowColor: '#6D6659',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 9,
  },
  cardDecoration: { opacity: 0.5, position: 'absolute' },
  walletDecoration: {
    bottom: -31,
    height: 120,
    left: -8,
    transform: [{ rotate: '17deg' }],
    width: 52,
  },
  categoryDecoration: {
    bottom: -31,
    height: 120,
    right: -5,
    transform: [{ rotate: '-17deg' }, { scaleX: -1 }],
    width: 52,
  },
  managementIcon: {
    alignItems: 'center',
    backgroundColor: palette.olive,
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    width: 52,
    zIndex: 1,
  },
  managementCopy: { flex: 1, gap: 2, minWidth: 0, zIndex: 1 },
  managementTitle: { fontSize: 21, fontWeight: '500', lineHeight: 27 },
  errorCard: {
    backgroundColor: '#FBEEE8',
    borderColor: '#EAC7B9',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
  },
  errorText: { color: palette.danger, fontSize: 15, fontWeight: '500', lineHeight: 21 },
  signOutButton: {
    alignItems: 'center',
    backgroundColor: '#CF5D46',
    borderColor: '#B9513D',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 4,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 62,
    overflow: 'hidden',
    paddingHorizontal: 54,
    position: 'relative',
    shadowColor: '#7D392B',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 9,
  },
  signOutButtonText: {
    color: palette.white,
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 27,
    textAlign: 'center',
    zIndex: 1,
  },
  signOutDecoration: {
    bottom: -29,
    height: 91,
    opacity: 0.65,
    position: 'absolute',
    right: 4,
    transform: [{ rotate: '29deg' }],
    width: 34,
  },
  buttonPressed: { opacity: 0.68 },
});
