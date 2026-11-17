import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { todayKey } from '@/lib/dates';
import { syncLetterNotifications } from '@/lib/reminders';
import type { Letter } from '@/lib/types';
import { api } from '@/services/api';
import { useAuth } from './auth';

type Status = 'loading' | 'ready' | 'error';

type LettersContextValue = {
  status: Status;
  /** Newest unlock date first. Locked letters carry no text. */
  letters: Letter[];
  reload: () => void;
  /** Seals a letter that opens on `unlockOn`. */
  create: (text: string, unlockOn: string) => Promise<Letter>;
  remove: (id: string) => Promise<void>;
  /** Records that the letter was read, so it stops showing as new. */
  markOpened: (id: string) => Promise<void>;
};

const LettersContext = createContext<LettersContextValue | null>(null);

export function LettersProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [attempt, setAttempt] = useState(0);
  const loadKey = userId ? `${userId}:${attempt}` : null;
  // Tagged with who and which attempt it was loaded for, so a different user never sees someone else's list.
  const [result, setResult] = useState<{ key: string; letters: Letter[]; error: boolean } | null>(null);

  useEffect(() => {
    if (!loadKey) return;
    let cancelled = false;
    api
      .listLetters(todayKey())
      .then((letters) => !cancelled && setResult({ key: loadKey, letters, error: false }))
      .catch(() => !cancelled && setResult({ key: loadKey, letters: [], error: true }));
    return () => {
      cancelled = true;
    };
  }, [loadKey]);

  const current = result && result.key === loadKey ? result : null;
  const letters = useMemo(() => current?.letters ?? [], [current]);
  const status: Status = !current ? 'loading' : current.error ? 'error' : 'ready';

  // Keep the "your letter is ready" notifications in step with the letters that are still sealed.
  useEffect(() => {
    if (status !== 'ready') return;
    syncLetterNotifications(letters.filter((l) => l.locked)).catch(() => {});
  }, [status, letters]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const create = useCallback(
    async (text: string, unlockOn: string) => {
      const made = await api.createLetter(text, unlockOn, todayKey());
      reload();
      return made;
    },
    [reload],
  );
  const remove = useCallback(
    async (id: string) => {
      await api.deleteLetter(id);
      reload();
    },
    [reload],
  );
  const markOpened = useCallback(
    async (id: string) => {
      await api.markLetterOpened(id, todayKey());
      reload();
    },
    [reload],
  );

  const value = useMemo(
    () => ({ status, letters, reload, create, remove, markOpened }),
    [status, letters, reload, create, remove, markOpened],
  );
  return <LettersContext.Provider value={value}>{children}</LettersContext.Provider>;
}

export function useLetters(): LettersContextValue {
  const ctx = useContext(LettersContext);
  if (!ctx) throw new Error('useLetters must be used inside LettersProvider');
  return ctx;
}
