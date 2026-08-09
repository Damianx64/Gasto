import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

type Credentials = {
  email: string;
  password: string;
};

type RegisterInput = Credentials & {
  userName: string;
};

export type OfflineAccount = {
  email: string | null;
  userId: string;
  userName: string | null;
};

const OFFLINE_ACCOUNT_KEY = 'auth:offline-account';
const offlineAccountListeners = new Set<(account: OfflineAccount | null) => void>();
let lastOfflineAccountSerialized: string | null = null;

function accountFromSession(session: Session): OfflineAccount {
  const metadataName = session.user.user_metadata?.user_name;
  return {
    email: session.user.email ?? null,
    userId: session.user.id,
    userName: typeof metadataName === 'string' && metadataName.trim() ? metadataName.trim() : null,
  };
}

async function saveOfflineAccount(account: OfflineAccount) {
  const serialized = JSON.stringify(account);
  if (serialized === lastOfflineAccountSerialized) return;

  try {
    await AsyncStorage.setItem(OFFLINE_ACCOUNT_KEY, serialized);
    lastOfflineAccountSerialized = serialized;
  } catch {
    // La sesión remota sigue siendo válida aunque no se pueda actualizar esta copia auxiliar.
  }
  for (const listener of offlineAccountListeners) listener(account);
}

async function clearOfflineAccount() {
  try {
    await AsyncStorage.removeItem(OFFLINE_ACCOUNT_KEY);
  } catch {
    // La sesión de Supabase ya fue cerrada; se limpia al menos el estado en memoria.
  }
  lastOfflineAccountSerialized = null;
  for (const listener of offlineAccountListeners) listener(null);
}

export async function getOfflineAccount() {
  try {
    const stored = await AsyncStorage.getItem(OFFLINE_ACCOUNT_KEY);
    if (!stored) return null;
    lastOfflineAccountSerialized = stored;

    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') return null;
    const account = parsed as Partial<OfflineAccount>;
    if (typeof account.userId !== 'string') return null;

    return {
      email: typeof account.email === 'string' ? account.email : null,
      userId: account.userId,
      userName: typeof account.userName === 'string' ? account.userName : null,
    } satisfies OfflineAccount;
  } catch {
    return null;
  }
}

export function subscribeToOfflineAccount(
  onAccountChange: (account: OfflineAccount | null) => void,
) {
  offlineAccountListeners.add(onAccountChange);
  return () => {
    offlineAccountListeners.delete(onAccountChange);
  };
}

export async function signIn({ email, password }: Credentials) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw error;
  if (data.session) await saveOfflineAccount(accountFromSession(data.session));
}

export async function register({ email, password, userName }: RegisterInput) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: userName ? { data: { user_name: userName } } : undefined,
  });

  if (error) throw error;

  if (data.user && data.session) {
    const now = new Date().toISOString();
    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        created_at: now,
        updated_at: now,
        user_id: data.user.id,
        user_name: userName || null,
      },
      { onConflict: 'user_id' },
    );

    if (profileError) throw profileError;
    await saveOfflineAccount(accountFromSession(data.session));
  }

  return { requiresEmailConfirmation: !data.session };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) throw error;
  await clearOfflineAccount();
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;
  if (data.session) await saveOfflineAccount(accountFromSession(data.session));
  return data.session;
}

export function subscribeToAuthState(onSessionChange: (session: Session | null) => void) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session) void saveOfflineAccount(accountFromSession(session));
    onSessionChange(session);
  });

  return () => subscription.unsubscribe();
}

export async function requireOfflineUserId() {
  const offlineAccount = await getOfflineAccount();
  if (!offlineAccount) throw new Error('No se encontró una sesión activa en este dispositivo.');
  return offlineAccount.userId;
}
