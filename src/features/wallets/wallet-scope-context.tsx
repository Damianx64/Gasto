import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useSync } from '@/features/offline/sync-context';

import type { Wallet } from './types';
import { listWallets } from './wallets.api';

type WalletScopeContextValue = {
  isReady: boolean;
  selectedWallet: Wallet | null;
  selectedWalletId: string | null;
  setSelectedWalletId: (walletId: string | null) => void;
  wallets: Wallet[];
};

const WalletScopeContext = createContext<WalletScopeContextValue>({
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

  useEffect(() => {
    let isActive = true;

    if (!userId || !isBootstrapped) {
      setWallets([]);
      setSelectedWalletIdState(null);
      setIsReady(!userId);
      return () => {
        isActive = false;
      };
    }

    setIsReady(false);
    void Promise.all([listWallets(), AsyncStorage.getItem(getSelectionKey(userId))])
      .then(([loadedWallets, storedWalletId]) => {
        if (!isActive) return;

        const validSelection = loadedWallets.some((wallet) => wallet.id === storedWalletId)
          ? storedWalletId
          : null;
        setWallets(loadedWallets);
        setSelectedWalletIdState(validSelection);
        setIsReady(true);

        if (storedWalletId && !validSelection) {
          void AsyncStorage.removeItem(getSelectionKey(userId));
        }
      })
      .catch(() => {
        if (!isActive) return;
        setWallets([]);
        setSelectedWalletIdState(null);
        setIsReady(true);
      });

    return () => {
      isActive = false;
    };
  }, [isBootstrapped, revision, userId]);

  const setSelectedWalletId = useCallback(
    (walletId: string | null) => {
      if (!userId) return;
      const validWalletId =
        walletId && wallets.some((wallet) => wallet.id === walletId) ? walletId : null;

      setSelectedWalletIdState(validWalletId);
      if (validWalletId) {
        void AsyncStorage.setItem(getSelectionKey(userId), validWalletId);
      } else {
        void AsyncStorage.removeItem(getSelectionKey(userId));
      }
    },
    [userId, wallets],
  );

  const selectedWallet = useMemo(
    () => wallets.find((wallet) => wallet.id === selectedWalletId) ?? null,
    [selectedWalletId, wallets],
  );
  const value = useMemo(
    () => ({ isReady, selectedWallet, selectedWalletId, setSelectedWalletId, wallets }),
    [isReady, selectedWallet, selectedWalletId, setSelectedWalletId, wallets],
  );

  return <WalletScopeContext.Provider value={value}>{children}</WalletScopeContext.Provider>;
}

export function useWalletScope() {
  return useContext(WalletScopeContext);
}
