import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { deviceCanLock, lockSupported, unlockWithDevice } from '@/lib/appLock';
import { readPref, writePref } from '@/lib/prefs';
import { LockScreen } from '@/shared-components/LockScreen';
import { useAuth } from './auth';

const KEY = 'lilac.lock.v1';
/** Coming back sooner than this does not ask again, so glancing at another app is not annoying. */
const GRACE_MS = 30_000;

type LockContextValue = {
  supported: boolean;
  enabled: boolean;
  /** Turns app lock on (after one successful unlock, so nobody locks themselves out) or off. Returns the outcome. */
  setEnabled: (on: boolean) => Promise<'ok' | 'unavailable' | 'cancelled'>;
};

const LockContext = createContext<LockContextValue | null>(null);

export function AppLockProvider({ children }: { children: ReactNode }) {
  const { session, signOut } = useAuth();
  const userId = session?.user.id ?? null;
  const [enabled, setEnabledState] = useState(false);
  const [loaded, setLoaded] = useState(!lockSupported);
  // The user who has passed the lock in this stretch of use. Locked means "someone is signed in, and it is not yet them".
  const [unlockedFor, setUnlockedFor] = useState<string | null>(null);
  const [away, setAway] = useState(false); // the app is not in the foreground (e.g. in the app switcher)
  const backgroundedAt = useRef<number | null>(null);
  const prompting = useRef(false);
  const autoTried = useRef(false);

  useEffect(() => {
    if (!lockSupported) return;
    readPref(KEY).then((raw) => {
      setEnabledState(raw === 'on');
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!lockSupported) return;
    const sub = AppState.addEventListener('change', (state) => {
      setAway(state !== 'active');
      if (state === 'background') {
        backgroundedAt.current = Date.now();
        autoTried.current = false;
      }
      if (state === 'active' && backgroundedAt.current !== null) {
        if (Date.now() - backgroundedAt.current >= GRACE_MS) setUnlockedFor(null);
        backgroundedAt.current = null;
      }
    });
    return () => sub.remove();
  }, []);

  const showLock = lockSupported && enabled && !!userId && unlockedFor !== userId;

  const prompt = useCallback(async () => {
    if (prompting.current || !userId) return;
    prompting.current = true;
    const ok = await unlockWithDevice('Unlock Lilac Pages');
    prompting.current = false;
    if (ok) setUnlockedFor(userId);
  }, [userId]);

  // Ask once as soon as the lock screen is up and the app is in front. The system prompt itself makes the app briefly
  // "inactive", so without the flag a cancelled prompt would immediately ask again.
  useEffect(() => {
    if (!showLock) {
      autoTried.current = false;
      return;
    }
    if (!away && !autoTried.current) {
      autoTried.current = true;
      prompt();
    }
  }, [showLock, away, prompt]);

  const setEnabled = useCallback(
    async (on: boolean) => {
      if (!on) {
        setEnabledState(false);
        await writePref(KEY, 'off');
        return 'ok' as const;
      }
      if (!(await deviceCanLock())) return 'unavailable' as const;
      if (!(await unlockWithDevice('Turn on app lock'))) return 'cancelled' as const;
      setEnabledState(true);
      setUnlockedFor(userId);
      await writePref(KEY, 'on');
      return 'ok' as const;
    },
    [userId],
  );

  const value = useMemo(() => ({ supported: lockSupported, enabled, setEnabled }), [enabled, setEnabled]);

  // Until the saved choice is read, cover the app so nothing flashes before the lock appears.
  const cover = lockSupported && !!userId && (!loaded || (enabled && away));
  return (
    <LockContext.Provider value={value}>
      {children}
      {showLock ? <LockScreen onUnlock={prompt} onSignOut={signOut} /> : cover ? <LockScreen /> : null}
    </LockContext.Provider>
  );
}

export function useAppLock(): LockContextValue {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useAppLock must be used inside AppLockProvider');
  return ctx;
}
