import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { readPref, writePref } from '@/lib/prefs';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/state/auth';

// Bump when what is sent to the model changes, so everyone is asked again.
const VERSION = 1;
const keyFor = (userId: string) => `lilac.consent.v${VERSION}.${userId}`;
// Also recorded on the account (Supabase user metadata), so agreeing once covers every device and browser.
const ACCOUNT_KEY = 'lilac_consent_version';

type ConsentValue = {
  /** False until the stored answer has been read. */
  ready: boolean;
  accepted: boolean;
  accept: () => Promise<void>;
};

const ConsentContext = createContext<ConsentValue | null>(null);

/**
 * Whether this person has agreed to their entries being read by the scoring model. Remembered on the account, so they
 * are asked once, not on every new device or browser; this device's own copy answers instantly while the account's loads.
 */
export function ConsentProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  // The stored answer, tagged with the account it was read for so a stale one is never used after switching accounts.
  const [stored, setStored] = useState<{ userId: string; accepted: boolean } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let live = true;
    readPref(keyFor(userId)).then((v) => live && setStored({ userId, accepted: v === 'yes' }));
    return () => {
      live = false;
    };
  }, [userId]);

  // Has the account itself recorded agreement to this version?
  const onAccount = Number(session?.user.user_metadata?.[ACCOUNT_KEY] ?? 0) >= VERSION;

  const recordOnAccount = useCallback(async () => {
    // Best effort: if it fails, the device copy still works and we try again next time.
    await supabase.auth.updateUser({ data: { [ACCOUNT_KEY]: VERSION } }).catch(() => {});
  }, []);

  const accept = useCallback(async () => {
    if (!userId) return;
    await writePref(keyFor(userId), 'yes');
    setStored({ userId, accepted: true });
    await recordOnAccount();
  }, [userId, recordOnAccount]);

  // Someone who agreed on this device before the account kept a record: write it down, once.
  const backfilled = useRef<string | null>(null);
  useEffect(() => {
    if (!userId || onAccount || backfilled.current === userId) return;
    if (stored?.userId !== userId || !stored.accepted) return;
    backfilled.current = userId;
    void recordOnAccount();
  }, [userId, onAccount, stored, recordOnAccount]);

  // The account's answer is already in the session, so it never has to wait for the device read.
  const ready = !userId || onAccount || stored?.userId === userId;
  const accepted = !!userId && (onAccount || (stored?.userId === userId && stored.accepted));
  const value = useMemo(() => ({ ready, accepted, accept }), [ready, accepted, accept]);
  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error('useConsent must be used inside ConsentProvider');
  return ctx;
}
