import { useCallback, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { router, type Href, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Alert,
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { useSync } from '@/features/offline/sync-context';
import { getErrorMessage } from '@/lib/errors';

import type { Wallet } from '../types';
import { useWalletScope } from '../wallet-scope-context';
import { deleteWallet, listWallets, reorderWallets } from '../wallets.api';

const WALLET_ROW_STRIDE = 104;

const palette = {
  background: '#FBF8F1',
  border: '#E4DAC9',
  danger: '#B65336',
  dangerPale: '#F8E3DA',
  ink: '#303A29',
  muted: '#77756E',
  olive: '#617149',
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

function getWalletTypeLabel(wallet: Wallet) {
  return wallet.type === 'cash' ? 'Efectivo' : 'Tarjeta de débito';
}

type SortableWalletCardProps = {
  deletingWalletId: string;
  disabled: boolean;
  index: number;
  isDragging: boolean;
  isDropTarget: boolean;
  onDelete: (wallet: Wallet) => void;
  onDragEnd: (walletId: string, translationY: number) => number;
  onDragMove: (walletId: string, translationY: number) => void;
  onDragStart: (walletId: string) => void;
  onEdit: (wallet: Wallet) => void;
  wallet: Wallet;
};

function SortableWalletCard({
  deletingWalletId,
  disabled,
  index,
  isDragging,
  isDropTarget,
  onDelete,
  onDragEnd,
  onDragMove,
  onDragStart,
  onEdit,
  wallet,
}: SortableWalletCardProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const callbacksRef = useRef({ onDragEnd, onDragMove, onDragStart });
  callbacksRef.current = { onDragEnd, onDragMove, onDragStart };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: () => {
          translateY.stopAnimation();
          translateY.setValue(0);
          callbacksRef.current.onDragStart(wallet.id);
        },
        onPanResponderMove: (_event, gestureState) => {
          translateY.setValue(gestureState.dy);
          callbacksRef.current.onDragMove(wallet.id, gestureState.dy);
        },
        onPanResponderRelease: (_event, gestureState) => {
          const restingOffset = callbacksRef.current.onDragEnd(wallet.id, gestureState.dy);
          translateY.setValue(restingOffset);
          Animated.spring(translateY, {
            damping: 20,
            mass: 0.7,
            stiffness: 220,
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          callbacksRef.current.onDragEnd(wallet.id, 0);
          Animated.spring(translateY, {
            damping: 20,
            stiffness: 220,
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminationRequest: () => false,
        onStartShouldSetPanResponder: () => !disabled,
      }),
    [disabled, translateY, wallet.id],
  );

  return (
    <Animated.View
      style={[
        styles.walletCard,
        isDragging && styles.walletCardDragging,
        isDropTarget && styles.walletCardDropTarget,
        { transform: [{ translateY }] },
      ]}>
      <Image
        accessible={false}
        contentFit="contain"
        pointerEvents="none"
        source={index % 2 === 0 ? decorations.leaves : decorations.flowers}
        style={[
          styles.walletDecoration,
          index % 2 === 0 ? styles.walletDecorationLeft : styles.walletDecorationRight,
        ]}
      />
      <View
        accessibilityHint="Desliza hacia arriba o abajo para cambiar la posición"
        accessibilityLabel={`Reordenar billetera ${wallet.name}`}
        accessibilityRole="adjustable"
        style={[styles.dragHandle, disabled && styles.dragHandleDisabled]}
        {...panResponder.panHandlers}>
        <SymbolView
          name={{ android: 'drag_handle', ios: 'line.3.horizontal', web: 'drag_handle' }}
          size={22}
          tintColor={palette.muted}
        />
      </View>
      <View style={styles.walletIcon}>
        <SymbolView
          name={
            wallet.type === 'cash'
              ? { android: 'payments', ios: 'banknote', web: 'payments' }
              : { android: 'credit_card', ios: 'creditcard', web: 'credit_card' }
          }
          size={27}
          tintColor={palette.white}
        />
      </View>
      <View style={styles.walletCopy}>
        <ThemedText numberOfLines={1} style={styles.walletName}>
          {wallet.name}
        </ThemedText>
        <ThemedText type="small" numberOfLines={1} style={styles.mutedText}>
          {getWalletTypeLabel(wallet)}
        </ThemedText>
      </View>
      <Pressable
        accessibilityLabel={`Editar billetera ${wallet.name}`}
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => onEdit(wallet)}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
        <SymbolView
          name={{ android: 'edit', ios: 'pencil', web: 'edit' }}
          size={23}
          tintColor={palette.oliveDark}
        />
      </Pressable>
      <Pressable
        accessibilityLabel={`Eliminar billetera ${wallet.name}`}
        accessibilityRole="button"
        disabled={disabled || deletingWalletId === wallet.id}
        onPress={() => onDelete(wallet)}
        style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
        {deletingWalletId === wallet.id ? (
          <ActivityIndicator color={palette.danger} size="small" />
        ) : (
          <SymbolView
            name={{ android: 'delete', ios: 'trash', web: 'delete' }}
            size={23}
            tintColor={palette.danger}
          />
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function ManageWalletsScreen() {
  const { revision } = useSync();
  const { selectedWalletId, setSelectedWalletId } = useWalletScope();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingWalletId, setDeletingWalletId] = useState('');
  const [draggedWalletId, setDraggedWalletId] = useState('');
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const hasLoadedRef = useRef(false);
  const dragStateRef = useRef<{
    startIndex: number;
    targetIndex: number;
    walletId: string;
  } | null>(null);

  const loadWallets = useCallback(async (mode: 'initial' | 'silent') => {
    setErrorMessage('');
    if (mode === 'initial') setIsLoading(true);

    try {
      setWallets(await listWallets());
      hasLoadedRef.current = true;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadWallets(hasLoadedRef.current ? 'silent' : 'initial');
    }, [loadWallets, revision]),
  );

  async function handleDeleteWallet(wallet: Wallet) {
    setDeletingWalletId(wallet.id);
    setErrorMessage('');

    try {
      await deleteWallet(wallet.id);
      if (selectedWalletId === wallet.id) setSelectedWalletId(null);
      setWallets((current) => current.filter((item) => item.id !== wallet.id));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setDeletingWalletId('');
    }
  }

  function confirmDeleteWallet(wallet: Wallet) {
    Alert.alert(
      'Eliminar billetera',
      'Los movimientos asociados no se eliminarán. Pasarán a mostrarse únicamente dentro del Balance general.',
      [
        { style: 'cancel', text: 'Cancelar' },
        {
          onPress: () => handleDeleteWallet(wallet),
          style: 'destructive',
          text: 'Eliminar',
        },
      ],
    );
  }

  function handleDragStart(walletId: string) {
    const startIndex = wallets.findIndex((wallet) => wallet.id === walletId);
    if (startIndex < 0) return;

    dragStateRef.current = { startIndex, targetIndex: startIndex, walletId };
    setDraggedWalletId(walletId);
    setDragTargetIndex(startIndex);
    setErrorMessage('');
  }

  function handleDragMove(walletId: string, translationY: number) {
    if (dragStateRef.current?.walletId !== walletId) return;

    const { startIndex } = dragStateRef.current;
    const targetIndex = Math.max(
      0,
      Math.min(wallets.length - 1, startIndex + Math.round(translationY / WALLET_ROW_STRIDE)),
    );
    if (targetIndex === dragStateRef.current.targetIndex) return;

    dragStateRef.current.targetIndex = targetIndex;
    setDragTargetIndex(targetIndex);
  }

  function handleDragEnd(walletId: string, translationY: number) {
    const dragState = dragStateRef.current;
    dragStateRef.current = null;
    setDraggedWalletId('');
    setDragTargetIndex(null);

    if (!dragState || dragState.walletId !== walletId) return 0;
    const { startIndex } = dragState;
    const targetIndex = Math.max(
      0,
      Math.min(wallets.length - 1, startIndex + Math.round(translationY / WALLET_ROW_STRIDE)),
    );
    if (startIndex === targetIndex) return translationY;

    const previousWallets = wallets;
    const nextWallets = [...wallets];
    const [movedWallet] = nextWallets.splice(startIndex, 1);
    nextWallets.splice(targetIndex, 0, movedWallet);
    const orderedWallets = nextWallets.map((wallet, sortOrder) => ({
      ...wallet,
      sort_order: sortOrder,
    }));

    setWallets(orderedWallets);
    setIsReordering(true);
    void reorderWallets(orderedWallets.map((wallet) => wallet.id))
      .catch((error) => {
        setWallets(previousWallets);
        setErrorMessage(getErrorMessage(error));
        void loadWallets('silent');
      })
      .finally(() => setIsReordering(false));

    return translationY - (targetIndex - startIndex) * WALLET_ROW_STRIDE;
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          scrollEnabled={!draggedWalletId}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <View style={styles.titleRow}>
                <ThemedText style={styles.title}>Billeteras</ThemedText>
                <Image
                  accessible={false}
                  contentFit="contain"
                  pointerEvents="none"
                  source={decorations.header}
                  style={styles.titleDecoration}
                />
              </View>
              <ThemedText style={styles.subtitle}>
                Arrastra cada billetera para elegir su orden en el dashboard.
              </ThemedText>
            </View>
            <View style={styles.addButtonWrap}>
              <Image
                accessible={false}
                contentFit="contain"
                pointerEvents="none"
                source={decorations.branch}
                style={styles.addButtonDecoration}
              />
              <Pressable
                accessibilityLabel="Añadir billetera"
                accessibilityRole="button"
                onPress={() => router.push('/wallet/new' as Href)}
                style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
                <SymbolView
                  name={{ android: 'add', ios: 'plus', web: 'add' }}
                  size={20}
                  tintColor={palette.white}
                />
                <ThemedText style={styles.addButtonText}>Añadir</ThemedText>
              </Pressable>
            </View>
          </View>

          {errorMessage ? (
            <View style={styles.errorCard}>
              <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
            </View>
          ) : null}

          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={palette.olive} />
              <ThemedText type="small" style={styles.mutedText}>
                Cargando billeteras...
              </ThemedText>
            </View>
          ) : wallets.length === 0 ? (
            <View style={styles.stateCard}>
              <View style={styles.emptyIcon}>
                <SymbolView
                  name={{ android: 'account_balance_wallet', ios: 'wallet.pass', web: 'account_balance_wallet' }}
                  size={30}
                  tintColor={palette.white}
                />
              </View>
              <ThemedText style={styles.emptyTitle}>Aún no hay billeteras</ThemedText>
              <ThemedText type="small" style={[styles.mutedText, styles.emptyText]}>
                Tus movimientos seguirán funcionando dentro del Balance general.
              </ThemedText>
            </View>
          ) : (
            <View style={styles.walletList}>
              {wallets.map((wallet, index) => (
                <SortableWalletCard
                  deletingWalletId={deletingWalletId}
                  disabled={
                    isReordering ||
                    Boolean(deletingWalletId) ||
                    (Boolean(draggedWalletId) && draggedWalletId !== wallet.id)
                  }
                  index={index}
                  isDragging={draggedWalletId === wallet.id}
                  isDropTarget={
                    Boolean(draggedWalletId) &&
                    dragTargetIndex === index &&
                    draggedWalletId !== wallet.id
                  }
                  key={wallet.id}
                  onDelete={confirmDeleteWallet}
                  onDragEnd={handleDragEnd}
                  onDragMove={handleDragMove}
                  onDragStart={handleDragStart}
                  onEdit={(item) =>
                    router.push(
                      { pathname: '/wallet/[id]', params: { id: item.id } } as unknown as Href,
                    )
                  }
                  wallet={wallet}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: palette.background, flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    alignSelf: 'center',
    gap: Spacing.four,
    maxWidth: 560,
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    width: '100%',
  },
  header: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three },
  headerCopy: { flex: 1, gap: 3 },
  titleRow: { alignItems: 'center', flexDirection: 'row' },
  title: { color: palette.ink, fontFamily: Fonts.serif, fontSize: 36, lineHeight: 43 },
  titleDecoration: {
    height: 34,
    marginLeft: 5,
    opacity: 0.8,
    transform: [{ rotate: '-9deg' }],
    width: 52,
  },
  subtitle: { color: palette.muted, fontFamily: Fonts.serif, fontSize: 15, lineHeight: 21 },
  addButtonWrap: {
    justifyContent: 'center',
    minHeight: 64,
    paddingRight: 5,
    position: 'relative',
  },
  addButtonDecoration: {
    height: 84,
    opacity: 0.72,
    position: 'absolute',
    right: -4,
    top: -20,
    transform: [{ rotate: '28deg' }],
    width: 32,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: palette.olive,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 6,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  addButtonText: { color: palette.white, fontFamily: Fonts.serif, fontSize: 16 },
  errorCard: { backgroundColor: '#FBEEE8', borderRadius: 14, padding: Spacing.three },
  errorText: { color: palette.danger, fontFamily: Fonts.serif },
  stateCard: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    justifyContent: 'center',
    minHeight: 220,
    padding: Spacing.four,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: palette.olive,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  emptyTitle: { color: palette.ink, fontFamily: Fonts.serif, fontSize: 21 },
  emptyText: { maxWidth: 330, textAlign: 'center' },
  mutedText: { color: palette.muted, fontFamily: Fonts.serif },
  walletList: { gap: 12 },
  walletCard: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 19,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    minHeight: 92,
    overflow: 'hidden',
    padding: 14,
    position: 'relative',
  },
  walletCardDropTarget: {
    borderColor: palette.olive,
    borderWidth: 2,
  },
  walletCardDragging: {
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    zIndex: 20,
  },
  walletDecoration: {
    height: 108,
    opacity: 0.56,
    position: 'absolute',
    width: 47,
  },
  walletDecorationLeft: {
    bottom: -25,
    left: -8,
    transform: [{ rotate: '17deg' }],
  },
  walletDecorationRight: {
    bottom: -26,
    right: -5,
    transform: [{ rotate: '-17deg' }, { scaleX: -1 }],
  },
  dragHandle: {
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'center',
    marginLeft: -6,
    width: 28,
    zIndex: 2,
  },
  dragHandleDisabled: { opacity: 0.35 },
  walletIcon: {
    alignItems: 'center',
    backgroundColor: palette.olive,
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    width: 52,
    zIndex: 1,
  },
  walletCopy: { flex: 1, minWidth: 0, zIndex: 1 },
  walletName: { color: palette.ink, fontFamily: Fonts.serif, fontSize: 20, lineHeight: 27 },
  iconButton: {
    alignItems: 'center',
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 44,
    zIndex: 1,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: palette.dangerPale,
    borderRadius: 14,
    height: 46,
    justifyContent: 'center',
    width: 44,
    zIndex: 1,
  },
  pressed: { opacity: 0.68 },
});
