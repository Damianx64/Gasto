import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { getCurrentSession, subscribeToAuthState } from './auth.api';

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionReady, setIsSessionReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getCurrentSession()
      .then((currentSession) => {
        if (isMounted) setSession(currentSession);
      })
      .catch(() => {
        if (isMounted) setSession(null);
      })
      .finally(() => {
        if (isMounted) setIsSessionReady(true);
      });

    const unsubscribe = subscribeToAuthState((nextSession) => {
      setSession(nextSession);
      setIsSessionReady(true);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return { isSessionReady, session };
}
