import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { todayKey } from '@/lib/dates';
import { readPref, writePref } from '@/lib/prefs';
import {
  cancelReminders,
  DEFAULT_REMINDER,
  getReminderPermission,
  parseReminder,
  remindersSupported,
  requestReminderPermission,
  scheduleReminders,
  type ReminderPermission,
  type ReminderPrefs,
} from '@/lib/reminders';
import { useAuth } from './auth';
import { useEntries } from './entries';

const KEY = 'lilac.reminder.v1';

type RemindersContextValue = {
  supported: boolean;
  prefs: ReminderPrefs;
  /** Whether the system currently lets the app show notifications. */
  permission: ReminderPermission;
  /** Turns reminders on or off. Returns false if turning on was refused by the system. */
  setEnabled: (on: boolean) => Promise<boolean>;
  setHour: (hour: number) => void;
};

const RemindersContext = createContext<RemindersContextValue | null>(null);

export function RemindersProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { status, getEntry } = useEntries();
  const router = useRouter();
  const [prefs, setPrefs] = useState<ReminderPrefs>(DEFAULT_REMINDER);
  const [loaded, setLoaded] = useState(false);
  const [permission, setPermission] = useState<ReminderPermission>('undetermined');
  const [resumes, setResumes] = useState(0); // bumps each time the app returns to the foreground
  const signedIn = !!session;
  const wroteToday = !!getEntry(todayKey());

  useEffect(() => {
    if (!remindersSupported) return;
    readPref(KEY).then((raw) => {
      setPrefs(parseReminder(raw));
      setLoaded(true);
    });
    getReminderPermission().then(setPermission);
  }, []);

  // Re-plan whenever the app opens, the choice changes, or today gets written; and drop everything on sign-out.
  useEffect(() => {
    if (!remindersSupported) return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') return;
      setResumes((n) => n + 1);
      getReminderPermission().then(setPermission);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!remindersSupported || !loaded) return;
    if (!signedIn) {
      cancelReminders().catch(() => {});
      return;
    }
    if (status !== 'ready') return;
    scheduleReminders(prefs, wroteToday).catch(() => {});
  }, [loaded, signedIn, status, prefs, wroteToday, resumes, permission]);

  // Tapping a reminder opens the writing page (which sends you to today's entry if it is already written).
  useEffect(() => {
    if (!remindersSupported || !signedIn) return;
    const open = (response: Notifications.NotificationResponse | null | undefined) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url !== 'string') return;
      Notifications.clearLastNotificationResponse();
      router.push('/write');
    };
    open(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [signedIn, router]);

  const update = useCallback((next: ReminderPrefs) => {
    setPrefs(next);
    writePref(KEY, JSON.stringify(next));
  }, []);

  const setEnabled = useCallback(
    async (on: boolean) => {
      if (on) {
        const current = await getReminderPermission();
        const allowed = current === 'granted' || (current === 'undetermined' && (await requestReminderPermission()));
        setPermission(await getReminderPermission());
        if (!allowed) return false;
      }
      update({ ...prefs, enabled: on });
      return true;
    },
    [prefs, update],
  );
  const setHour = useCallback((hour: number) => update({ ...prefs, hour, minute: 0 }), [prefs, update]);

  const value = useMemo(
    () => ({ supported: remindersSupported, prefs, permission, setEnabled, setHour }),
    [prefs, permission, setEnabled, setHour],
  );
  return <RemindersContext.Provider value={value}>{children}</RemindersContext.Provider>;
}

export function useReminders(): RemindersContextValue {
  const ctx = useContext(RemindersContext);
  if (!ctx) throw new Error('useReminders must be used inside RemindersProvider');
  return ctx;
}
