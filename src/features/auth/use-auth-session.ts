import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import * as Network from 'expo-network';

import {
  getCurrentSession,
  getOfflineAccount,
  type OfflineAccount,
  subscribeToAuthState,
  subscribeToOfflineAccount,
} from './auth.api';

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [offlineAccount, setOfflineAccount] = useState<OfflineAccount | null>(null);
  const [isSessionReady, setIsSessionReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadAuthState() {
      const storedAccount = await getOfflineAccount();
      if (isMounted) {
        setOfflineAccount(storedAccount);
        setIsSessionReady(true);
      }

      // Las cuentas ya preparadas se abren desde la identidad local. La sesión remota se
      // recupera después, durante una sincronización explícita, para no tocar la red offline.
      if (storedAccount) return;

      const network = await Network.getNetworkStateAsync().catch(() => null);
      const canReachNetwork =
        network?.isConnected === true && network.isInternetReachable !== false;
      if (!canReachNetwork) return;

      try {
        const currentSession = await getCurrentSession();
        if (isMounted) setSession(currentSession);
      } catch {
        if (isMounted) setSession(null);
      }
    }

    void loadAuthState();

    const unsubscribe = subscribeToAuthState((nextSession) => {
      setSession(nextSession);
      setIsSessionReady(true);
    });
    const unsubscribeOfflineAccount = subscribeToOfflineAccount((nextAccount) => {
      setOfflineAccount(nextAccount);
      setIsSessionReady(true);
    });

    return () => {
      isMounted = false;
      unsubscribe();
      unsubscribeOfflineAccount();
    };
  }, []);

  return { isSessionReady, offlineAccount, session };
}
