import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { supabase } from '@/services/supabase';

type AuthContextValue = {
  session: Session | null;
  /** True until the stored session (if any) has been read. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /** Resolves true if the user can go straight in, false if they must confirm their email first. */
  signUp: (email: string, password: string, fullName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  /** Emails a 6-digit reset code. Resolves the same whether or not the address has an account. */
  sendResetCode: (email: string) => Promise<void>;
  /** Checks the emailed code and sets the new password. On success the user is signed in. */
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // While a password reset is in progress, the code check signs the user in before the new password is saved. Hold the
  // app on the reset screen until both steps are done, so a failure doesn't leave them inside with the old password.
  const holdSession = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!holdSession.current) setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // On phones, only refresh the token while the app is in the foreground.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => sub.remove();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    if (error) throw error;
    return !!data.session;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const sendResetCode = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }, []);

  const resetPassword = useCallback(async (email: string, code: string, newPassword: string) => {
    holdSession.current = true;
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
      if (error) throw error;
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        await supabase.auth.signOut({ scope: 'local' }); // only this device: don't sign them out elsewhere
        throw updateError;
      }
    } finally {
      holdSession.current = false;
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    }
  }, []);

  const value = useMemo(
    () => ({ session, loading, signIn, signUp, signOut, sendResetCode, resetPassword }),
    [session, loading, signIn, signUp, signOut, sendResetCode, resetPassword],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
