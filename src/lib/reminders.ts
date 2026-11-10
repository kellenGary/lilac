import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/*
 * Daily writing reminders. These are local notifications scheduled on the device: nothing is sent from a server, and
 * the text never contains anything from the journal.
 */

export type ReminderPrefs = { enabled: boolean; hour: number; minute: number };
export type ReminderPermission = 'granted' | 'denied' | 'undetermined';

export const DEFAULT_REMINDER: ReminderPrefs = { enabled: false, hour: 20, minute: 0 };

/** Times offered in Settings. */
export const REMINDER_TIMES = [
  { hour: 8, label: '8 AM' },
  { hour: 12, label: 'Noon' },
  { hour: 18, label: '6 PM' },
  { hour: 20, label: '8 PM' },
] as const;

/** Phones only: the web build has no local notifications. */
export const remindersSupported = Platform.OS === 'ios' || Platform.OS === 'android';

// How many days ahead are scheduled. The app re-plans every time it opens, so this only matters if it is not opened.
const DAYS_AHEAD = 14;

const MESSAGES = [
  'A few lines about today, whenever you are ready.',
  'Your page is waiting. No pressure, just a little time for yourself.',
  'How was today? Write it down while it is still close.',
  'A quiet minute to write, and your plant keeps growing.',
  'Take a moment to notice how you are doing.',
  'Anything worth remembering from today?',
  'Your journal is here when you want it.',
];

export function parseReminder(raw: string | null): ReminderPrefs {
  if (!raw) return DEFAULT_REMINDER;
  try {
    const p = JSON.parse(raw) as Partial<ReminderPrefs>;
    const hour = Number.isInteger(p.hour) && p.hour! >= 0 && p.hour! <= 23 ? p.hour! : DEFAULT_REMINDER.hour;
    const minute = Number.isInteger(p.minute) && p.minute! >= 0 && p.minute! <= 59 ? p.minute! : DEFAULT_REMINDER.minute;
    return { enabled: p.enabled === true, hour, minute };
  } catch {
    return DEFAULT_REMINDER;
  }
}

/** When reminders should fire: each upcoming day at the chosen time, skipping today once today is written. */
export function reminderDates(prefs: ReminderPrefs, now: Date, wroteToday: boolean): Date[] {
  if (!prefs.enabled) return [];
  const dates: Date[] = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, prefs.hour, prefs.minute, 0);
    if (at <= now || (i === 0 && wroteToday)) continue;
    dates.push(at);
  }
  return dates;
}

export async function getReminderPermission(): Promise<ReminderPermission> {
  if (!remindersSupported) return 'denied';
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

/** Shows the system prompt (once) and returns whether notifications are allowed. */
export async function requestReminderPermission(): Promise<boolean> {
  if (!remindersSupported) return false;
  const p = await Notifications.requestPermissionsAsync();
  return p.granted;
}

export async function cancelReminders(): Promise<void> {
  if (remindersSupported) await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Replaces everything scheduled with the plan for `prefs`. */
export async function scheduleReminders(prefs: ReminderPrefs, wroteToday: boolean): Promise<void> {
  if (!remindersSupported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const date of reminderDates(prefs, new Date(), wroteToday)) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Lilac Pages',
        body: MESSAGES[(date.getDate() + date.getMonth()) % MESSAGES.length],
        data: { url: '/write' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
  }
}

if (remindersSupported) {
  // Show reminders as a banner even if the app happens to be open.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
