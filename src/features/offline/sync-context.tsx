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
import * as Network from 'expo-network';
import { AppState } from 'react-native';

import { getErrorMessage } from '@/lib/errors';

import { getLocalDatabase, getLocalUserState } from './database';
import { subscribeToLocalData } from './events';
import {
  OfflineNetworkError,
  SyncAuthenticationError,
  synchronizeUser,
} from './sync.service';
import type { SyncConnectivity, SyncState } from './types';

type SyncContextValue = SyncState & {
  syncNow: () => Promise<boolean>;
};

const defaultState: SyncState = {
  connectivity: 'unknown',
  errorMessage: '',
  isBootstrapped: false,
  lastSyncedAt: null,
  pendingCount: 0,
  requiresReauthentication: false,
  revision: 0,
  status: 'bootstrapping',
};

const SyncContext = createContext<SyncContextValue>({
  ...defaultState,
  syncNow: async () => false,
});

type SyncProviderProps = PropsWithChildren<{
  remoteSessionToken: string | null;
  userId: string | null;
}>;

type ReachabilityState = {
  isConnected?: boolean | null;
  isInternetReachable?: boolean | null;
};

function getConnectivity(network: ReachabilityState): SyncConnectivity {
  if (network.isConnected === false || network.isInternetReachable === false) {
    return 'offline';
  }
  if (network.isConnected === true) {
    return 'online';
  }
  return 'unknown';
}

export function SyncProvider({
  children,
  remoteSessionToken,
  userId,
}: SyncProviderProps) {
  const [state, setState] = useState<SyncState>(defaultState);
  const activeSyncRef = useRef<Promise<boolean> | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const connectivityRef = useRef<SyncConnectivity>('unknown');
  const mountedRef = useRef(true);
  const trailingSyncRequestedRef = useRef(false);
  const userIdRef = useRef(userId);

  userIdRef.current = userId;

  const refreshLocalState = useCallback(async (incrementRevision = false) => {
    const activeUserId = userIdRef.current;
    if (!activeUserId) return null;

    const localState = await getLocalUserState(activeUserId);
    if (!mountedRef.current || userIdRef.current !== activeUserId) return localState;

    setState((current) => ({
      ...current,
      ...localState,
      revision: current.revision + (incrementRevision ? 1 : 0),
    }));
    return localState;
  }, []);

  const updateConnectivity = useCallback((nextConnectivity: SyncConnectivity) => {
    const previousConnectivity = connectivityRef.current;

    // Un valor indeterminado posterior no debe borrar un estado conocido ni provocar
    // una falsa reconexión cuando llegue la siguiente notificación del sistema.
    if (nextConnectivity === 'unknown' && previousConnectivity !== 'unknown') {
      return previousConnectivity;
    }

    connectivityRef.current = nextConnectivity;
    if (mountedRef.current) {
      setState((current) => ({
        ...current,
        connectivity: nextConnectivity,
        ...(nextConnectivity === 'offline'
          ? { errorMessage: '', status: 'offline' as const }
          : {}),
      }));
    }
    return previousConnectivity;
  }, []);

  const executeSync = useCallback(async () => {
    const activeUserId = userIdRef.current;
    if (!activeUserId || connectivityRef.current !== 'online') {
      if (mountedRef.current && connectivityRef.current === 'offline') {
        setState((current) => ({ ...current, errorMessage: '', status: 'offline' }));
      }
      return false;
    }

    setState((current) => ({
      ...current,
      errorMessage: '',
      requiresReauthentication: false,
      status: 'syncing',
    }));

    try {
      await synchronizeUser(activeUserId);
      const localState = await refreshLocalState();

      if (mountedRef.current && userIdRef.current === activeUserId) {
        setState((current) => ({
          ...current,
          ...(localState ?? {}),
          connectivity: 'online',
          errorMessage: '',
          requiresReauthentication: false,
          status: 'synced',
        }));
      }
      return true;
    } catch (error) {
      const offline = error instanceof OfflineNetworkError;
      const requiresReauthentication = error instanceof SyncAuthenticationError;
      if (offline) connectivityRef.current = 'offline';

      if (mountedRef.current && userIdRef.current === activeUserId) {
        const localState = await refreshLocalState();
        setState((current) => ({
          ...current,
          ...(localState ?? {}),
          connectivity: offline ? 'offline' : current.connectivity,
          errorMessage: offline ? '' : getErrorMessage(error),
          requiresReauthentication,
          status: offline ? 'offline' : 'error',
        }));
      }
      return false;
    }
  }, [refreshLocalState]);

  const requestSync = useCallback(
    (queueOneTrailingSync = false) => {
      if (activeSyncRef.current) {
        if (queueOneTrailingSync) trailingSyncRequestedRef.current = true;
        return activeSyncRef.current;
      }

      const activeUserId = userIdRef.current;
      if (!activeUserId) return Promise.resolve(false);

      const synchronization = (async () => {
        const succeeded = await executeSync();
        const shouldRunTrailingSync =
          succeeded &&
          trailingSyncRequestedRef.current &&
          connectivityRef.current === 'online' &&
          appStateRef.current === 'active' &&
          userIdRef.current === activeUserId;

        trailingSyncRequestedRef.current = false;
        if (!shouldRunTrailingSync) return succeeded;

        return executeSync();
      })();

      const trackedSynchronization = synchronization.finally(() => {
        if (activeSyncRef.current === trackedSynchronization) {
          activeSyncRef.current = null;
        }
        trailingSyncRequestedRef.current = false;
      });
      activeSyncRef.current = trackedSynchronization;
      return trackedSynchronization;
    },
    [executeSync],
  );

  const syncNow = useCallback(async () => {
    if (connectivityRef.current !== 'online') {
      const network = await Network.getNetworkStateAsync().catch(() => null);
      if (!network) return false;

      const nextConnectivity = getConnectivity(network);
      updateConnectivity(nextConnectivity);
      if (nextConnectivity !== 'online') return false;
    }

    return requestSync();
  }, [requestSync, updateConnectivity]);

  useEffect(() => {
    mountedRef.current = true;
    void getLocalDatabase();

    return () => {
      mountedRef.current = false;
      trailingSyncRequestedRef.current = false;
    };
  }, []);

  useEffect(() => {
    trailingSyncRequestedRef.current = false;

    if (!userId) {
      setState({ ...defaultState, connectivity: connectivityRef.current });
      return;
    }

    setState((current) => ({
      ...current,
      errorMessage: '',
      requiresReauthentication: false,
      status: 'bootstrapping',
    }));

    void refreshLocalState().then(() => {
      if (!mountedRef.current || userIdRef.current !== userId) return;

      if (connectivityRef.current === 'online' && appStateRef.current === 'active') {
        void requestSync();
      } else if (connectivityRef.current === 'offline') {
        setState((current) => ({ ...current, errorMessage: '', status: 'offline' }));
      }
    });
  }, [refreshLocalState, requestSync, userId]);

  useEffect(() => {
    if (!remoteSessionToken || !userId) return;

    setState((current) => ({
      ...current,
      errorMessage: '',
      requiresReauthentication: false,
    }));
    if (connectivityRef.current === 'online' && appStateRef.current === 'active') {
      void requestSync();
    }
  }, [remoteSessionToken, requestSync, userId]);

  useEffect(() => {
    return subscribeToLocalData((reason) => {
      void refreshLocalState(true).then(() => {
        if (
          reason === 'mutation' &&
          connectivityRef.current === 'online' &&
          appStateRef.current === 'active'
        ) {
          void requestSync(true);
        }
      });
    });
  }, [refreshLocalState, requestSync]);

  useEffect(() => {
    const handleNetworkState = (network: ReachabilityState) => {
      const nextConnectivity = getConnectivity(network);
      const previousConnectivity = updateConnectivity(nextConnectivity);

      if (
        nextConnectivity === 'online' &&
        previousConnectivity !== 'online' &&
        appStateRef.current === 'active'
      ) {
        void requestSync();
      }
    };

    void Network.getNetworkStateAsync().then(handleNetworkState).catch(() => undefined);
    const networkSubscription = Network.addNetworkStateListener(handleNetworkState);
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (
        previousState !== 'active' &&
        nextState === 'active' &&
        connectivityRef.current === 'online'
      ) {
        void requestSync();
      }
    });

    return () => {
      networkSubscription.remove();
      appStateSubscription.remove();
    };
  }, [requestSync, updateConnectivity]);

  const value = useMemo(() => ({ ...state, syncNow }), [state, syncNow]);
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  return useContext(SyncContext);
}
