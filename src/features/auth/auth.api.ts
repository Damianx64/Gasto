import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

type Credentials = {
  email: string;
  password: string;
};

type RegisterInput = Credentials & {
  userName: string;
};

export async function signIn({ email, password }: Credentials) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw error;
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
  }

  return { requiresEmailConfirmation: !data.session };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) throw error;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;
  return data.session;
}

export function subscribeToAuthState(onSessionChange: (session: Session | null) => void) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => onSessionChange(session));

  return () => subscription.unsubscribe();
}

export async function requireCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;
  if (!data.user) throw new Error('No se encontró una sesión activa.');

  return data.user.id;
}
