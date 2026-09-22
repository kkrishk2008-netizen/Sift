import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase/client';

export type AuthMode = 'loading' | 'signedOut' | 'demo' | 'user';

interface AuthState {
  mode: AuthMode;
  userId: string | null;
  email: string | null;
}

interface AuthValue extends AuthState {
  signInDemo: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
}

const DEMO_KEY = 'sift.demo_user';
const Ctx = createContext<AuthValue | null>(null);

const fromSession = (s: Session): AuthState => ({ mode: 'user', userId: s.user.id, email: s.user.email ?? null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ mode: 'loading', userId: null, email: null });

  useEffect(() => {
    let mounted = true;
    (async () => {
      let session: Session | null = null;
      try {
        if (supabase) session = (await supabase.auth.getSession()).data.session;
      } catch {
        /* offline: fall through */
      }
      const demo = await AsyncStorage.getItem(DEMO_KEY).catch(() => null);
      if (!mounted) return;
      if (session) setState(fromSession(session));
      else if (demo === '1') setState({ mode: 'demo', userId: null, email: null });
      else setState({ mode: 'signedOut', userId: null, email: null });
    })();

    const sub = supabase?.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session) setState(fromSession(session));
      else setState((prev) => (prev.mode === 'user' ? { mode: 'signedOut', userId: null, email: null } : prev));
    });
    return () => {
      mounted = false;
      sub?.data.subscription.unsubscribe();
    };
  }, []);

  const signInDemo = useCallback(async () => {
    await AsyncStorage.setItem(DEMO_KEY, '1').catch(() => undefined);
    setState({ mode: 'demo', userId: null, email: null });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Sign-in needs a Supabase project. Use “Continue as Demo User”.' };
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) return { error: error.message };
      await AsyncStorage.removeItem(DEMO_KEY).catch(() => undefined);
      return {};
    } catch {
      return { error: 'Could not reach the server. Check your internet connection.' };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Sign-up needs a Supabase project. Use “Continue as Demo User”.' };
    try {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) return { error: error.message };
      if (!data.session) return { needsConfirmation: true };
      await AsyncStorage.removeItem(DEMO_KEY).catch(() => undefined);
      return {};
    } catch {
      return { error: 'Could not reach the server. Check your internet connection.' };
    }
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(DEMO_KEY).catch(() => undefined);
    try {
      await supabase?.auth.signOut();
    } catch {
      /* ignore */
    }
    setState({ mode: 'signedOut', userId: null, email: null });
  }, []);

  const value = useMemo(
    () => ({ ...state, signInDemo, signIn, signUp, signOut }),
    [state, signInDemo, signIn, signUp, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
