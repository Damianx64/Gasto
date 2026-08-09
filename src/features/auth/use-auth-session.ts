import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import * as Network from 'expo-network';

import { runOneTimeDataReset } from '@/features/offline/reset';

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
    let unsubscribeAuthState: () => void = () => undefined;
    let unsubscribeOfflineAccount: () => void = () => undefined;

    async function loadAuthState() {
      await runOneTimeDataReset();
      if (!isMounted) return;

      // Se suscribe solamente después del reset para que INITIAL_SESSION no pueda
      // restaurar una sesión antigua mientras todavía se limpian los datos locales.
      unsubscribeAuthState = subscribeToAuthState((nextSession) => {
        setSession(nextSession);
        setIsSessionReady(true);
      });
      unsubscribeOfflineAccount = subscribeToOfflineAccount((nextAccount) => {
        setOfflineAccount(nextAccount);
        setIsSessionReady(true);
      });

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

    return () => {
      isMounted = false;
      unsubscribeAuthState();
      unsubscribeOfflineAccount();
    };
  }, []);

  return { isSessionReady, offlineAccount, session };
}
