import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';

import { useSync } from '../sync-context';

type SyncStatusModalProps = {
  onClose: () => void;
  visible: boolean;
};

const palette = {
  backdrop: 'rgba(35, 40, 31, 0.42)',
  border: '#E4DAC9',
  danger: '#B65336',
  dangerPale: '#F8E3DA',
  ink: '#303A29',
  muted: '#77756E',
  offline: '#8B8B84',
  olive: '#617149',
  oliveDark: '#4E5C39',
  olivePale: '#E5E7DB',
  surface: '#FEFCF7',
  white: '#FFFDF8',
} as const;

function formatLastSyncedAt(value: string | null) {
  if (!value) return 'Aún no se ha sincronizado';

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Fecha no disponible';

  return date.toLocaleString('es-MX', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function SyncStatusModal({ onClose, visible }: SyncStatusModalProps) {
  const {
    connectivity,
    errorMessage,
    lastSyncedAt,
    pendingCount,
    requiresReauthentication,
    status,
    syncNow,
  } = useSync();

  const isWorking = status === 'bootstrapping' || status === 'syncing';
  const canSync = connectivity === 'online' && !isWorking;
  const hasError = status === 'error' || requiresReauthentication;
  const statusLabel =
    status === 'syncing'
      ? 'Sincronizando…'
      : connectivity === 'offline'
        ? 'Sin conexión'
        : hasError
          ? 'Problema de sincronización'
          : connectivity === 'online'
            ? 'Conectado'
            : 'Comprobando conexión';
  const helperMessage = requiresReauthentication
    ? 'Vuelve a iniciar sesión para sincronizar. Tus datos locales y pendientes se conservarán.'
    : errorMessage
      ? errorMessage
      : connectivity === 'offline'
        ? 'Puedes seguir trabajando. Los cambios se enviarán cuando vuelva la conexión.'
        : pendingCount > 0
          ? 'Tus cambios están guardados localmente y listos para enviarse.'
          : 'Tus datos locales están al día con Supabase.';
  const statusColor = hasError
    ? palette.danger
    : connectivity === 'offline'
      ? palette.offline
      : palette.olive;

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}>
      <Pressable
        accessibilityLabel="Cerrar detalle de sincronización"
        accessibilityRole="button"
        onPress={onClose}
        style={styles.backdrop}>
        <SafeAreaView style={styles.safeArea}>
          <Pressable
            accessibilityViewIsModal
            onPress={(event) => event.stopPropagation()}
            style={styles.card}>
            <View style={styles.header}>
              <View style={styles.headerTitle}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <ThemedText style={styles.title}>Sincronización</ThemedText>
              </View>
              <Pressable
                accessibilityLabel="Cerrar"
                accessibilityRole="button"
                hitSlop={10}
                onPress={onClose}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
                <SymbolView
                  name={{ android: 'close', ios: 'xmark', web: 'close' }}
                  size={20}
                  tintColor={palette.muted}
                />
              </Pressable>
            </View>

            <View style={[styles.statusCard, hasError && styles.errorStatusCard]}>
              {status === 'syncing' ? (
                <ActivityIndicator color={statusColor} size="small" />
              ) : (
                <View style={[styles.largeStatusDot, { backgroundColor: statusColor }]} />
              )}
              <View style={styles.statusCopy}>
                <ThemedText style={styles.statusLabel}>{statusLabel}</ThemedText>
                <ThemedText style={styles.helperText}>{helperMessage}</ThemedText>
              </View>
            </View>

            <View style={styles.details}>
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Cambios pendientes</ThemedText>
                <ThemedText style={[styles.detailValue, pendingCount > 0 && styles.pendingValue]}>
                  {pendingCount}
                </ThemedText>
              </View>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>Última sincronización</ThemedText>
                <ThemedText numberOfLines={2} style={[styles.detailValue, styles.dateValue]}>
                  {formatLastSyncedAt(lastSyncedAt)}
                </ThemedText>
              </View>
            </View>

            <Pressable
              accessibilityHint={
                connectivity === 'offline'
                  ? 'Estará disponible cuando recuperes la conexión'
                  : 'Envía y descarga los cambios ahora'
              }
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSync }}
              disabled={!canSync}
              onPress={() => void syncNow()}
              style={({ pressed }) => [
                styles.syncButton,
                !canSync && styles.disabledButton,
                pressed && canSync && styles.pressed,
              ]}>
              {status === 'syncing' ? (
                <ActivityIndicator color={palette.white} size="small" />
              ) : (
                <SymbolView
                  name={{ android: 'sync', ios: 'arrow.triangle.2.circlepath', web: 'sync' }}
                  size={18}
                  tintColor={palette.white}
                />
              )}
              <ThemedText style={styles.syncButtonText}>
                {status === 'syncing' ? 'Sincronizando…' : 'Sincronizar ahora'}
              </ThemedText>
            </Pressable>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: palette.backdrop,
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    alignSelf: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 24,
    borderWidth: 1,
    elevation: 8,
    gap: Spacing.three,
    maxWidth: 430,
    padding: Spacing.four,
    shadowColor: palette.ink,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerTitle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  statusDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  title: {
    color: palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 30,
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  statusCard: {
    alignItems: 'flex-start',
    backgroundColor: palette.olivePale,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 12,
    padding: Spacing.three,
  },
  errorStatusCard: {
    backgroundColor: palette.dangerPale,
  },
  largeStatusDot: {
    borderRadius: 7,
    height: 14,
    marginTop: 5,
    width: 14,
  },
  statusCopy: {
    flex: 1,
    gap: 4,
  },
  statusLabel: {
    color: palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 23,
  },
  helperText: {
    color: palette.muted,
    fontFamily: Fonts.serif,
    fontSize: 14,
    lineHeight: 20,
  },
  details: {
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'space-between',
    minHeight: 56,
    paddingVertical: 10,
  },
  detailLabel: {
    color: palette.muted,
    flexShrink: 1,
    fontFamily: Fonts.serif,
    fontSize: 14,
  },
  detailValue: {
    color: palette.ink,
    fontFamily: Fonts.serif,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
  },
  pendingValue: {
    color: palette.danger,
  },
  dateValue: {
    flex: 1,
  },
  divider: {
    backgroundColor: palette.border,
    height: StyleSheet.hairlineWidth,
  },
  syncButton: {
    alignItems: 'center',
    backgroundColor: palette.oliveDark,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: Spacing.three,
  },
  disabledButton: {
    opacity: 0.42,
  },
  syncButtonText: {
    color: palette.white,
    fontFamily: Fonts.serif,
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.68,
  },
});
