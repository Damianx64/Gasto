import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useSync } from '@/features/offline/sync-context';

import type { Wallet } from './types';
import { listWallets } from './wallets.api';

type WalletScopeContextValue = {
  consumeWalletChangeAnimation: (screen: 'reports' | 'transactions') => boolean;
  isReady: boolean;
  selectedWallet: Wallet | null;
  selectedWalletId: string | null;
  setSelectedWalletId: (
    walletId: string | null,
    options?: { animateLinkedScreens?: boolean },
  ) => void;
  wallets: Wallet[];
};

const WalletScopeContext = createContext<WalletScopeContextValue>({
  consumeWalletChangeAnimation: () => false,
  isReady: false,
  selectedWallet: null,
  selectedWalletId: null,
  setSelectedWalletId: () => undefined,
  wallets: [],
});

type WalletScopeProviderProps = PropsWithChildren<{
  userId: string | null;
}>;

function getSelectionKey(userId: string) {
  return `wallet-selection:${userId}`;
}

export function WalletScopeProvider({ children, userId }: WalletScopeProviderProps) {
  const { isBootstrapped, revision } = useSync();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWalletId, setSelectedWalletIdState] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const loadedUserIdRef = useRef<string | null>(null);
  const walletChangeRevisionRef = useRef(0);
  const consumedWalletChangeRef = useRef({ reports: 0, transactions: 0 });

  useEffect(() => {
    let isActive = true;

    if (!userId || !isBootstrapped) {
      loadedUserIdRef.current = null;
      setWallets([]);
      setSelectedWalletIdState(null);
      setIsReady(!userId);
      walletChangeRevisionRef.current = 0;
      consumedWalletChangeRef.current = { reports: 0, transactions: 0 };
      return () => {
        isActive = false;
      };
    }

    if (loadedUserIdRef.current !== userId) setIsReady(false);
    void Promise.all([listWallets(), AsyncStorage.getItem(getSelectionKey(userId))])
      .then(([loadedWallets, storedWalletId]) => {
        if (!isActive) return;

        const validSelection = loadedWallets.some((wallet) => wallet.id === storedWalletId)
          ? storedWalletId
          : null;
        setWallets(loadedWallets);
        setSelectedWalletIdState(validSelection);
        loadedUserIdRef.current = userId;
        setIsReady(true);

        if (storedWalletId && !validSelection) {
          void AsyncStorage.removeItem(getSelectionKey(userId));
        }
      })
      .catch(() => {
        if (!isActive) return;
        setWallets([]);
        setSelectedWalletIdState(null);
        loadedUserIdRef.current = userId;
        setIsReady(true);
      });

    return () => {
      isActive = false;
    };
  }, [isBootstrapped, revision, userId]);

  const setSelectedWalletId = useCallback(
    (walletId: string | null, options?: { animateLinkedScreens?: boolean }) => {
      if (!userId) return;
      const validWalletId =
        walletId && wallets.some((wallet) => wallet.id === walletId) ? walletId : null;

      if (validWalletId === selectedWalletId) return;
      if (options?.animateLinkedScreens) walletChangeRevisionRef.current += 1;

      setSelectedWalletIdState(validWalletId);
      if (validWalletId) {
        void AsyncStorage.setItem(getSelectionKey(userId), validWalletId);
      } else {
        void AsyncStorage.removeItem(getSelectionKey(userId));
      }
    },
    [selectedWalletId, userId, wallets],
  );

  const consumeWalletChangeAnimation = useCallback(
    (screen: 'reports' | 'transactions') => {
      const revisionToConsume = walletChangeRevisionRef.current;
      if (!revisionToConsume || consumedWalletChangeRef.current[screen] >= revisionToConsume) {
        return false;
      }

      consumedWalletChangeRef.current[screen] = revisionToConsume;
      return true;
    },
    [],
  );

  const selectedWallet = useMemo(
    () => wallets.find((wallet) => wallet.id === selectedWalletId) ?? null,
    [selectedWalletId, wallets],
  );
  const value = useMemo(
    () => ({
      consumeWalletChangeAnimation,
      isReady,
      selectedWallet,
      selectedWalletId,
      setSelectedWalletId,
      wallets,
    }),
    [
      consumeWalletChangeAnimation,
      isReady,
      selectedWallet,
      selectedWalletId,
      setSelectedWalletId,
      wallets,
    ],
  );

  return <WalletScopeContext.Provider value={value}>{children}</WalletScopeContext.Provider>;
}

export function useWalletScope() {
  return useContext(WalletScopeContext);
}
