import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, Text, TextInput, View, type TextStyle } from 'react-native';

import { saveFile } from '@/lib/download';
import { REMINDER_TIMES } from '@/lib/reminders';
import { weekStartKey } from '@/lib/dates';
import { api } from '@/services/api';
import { Button, Column, Container, PageHeader, Reveal, Screen, Segmented, Switch } from '@/shared-components';
import { useAuth } from '@/state/auth';
import { useEntries } from '@/state/entries';
import { useAppLock } from '@/state/lock';
import { useReminders } from '@/state/reminders';
import { useTheme } from '@/state/theme';
import { PHASE_LABEL } from '@/theme/palettes';
import { Card, Row, Stat } from './components/parts';

const noOutline = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as unknown as TextStyle;

const monthYear = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';

export function SettingsPage() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { entries, streak, reload } = useEntries();
  const { appearance, setAppearance, timeOfDay, setTimeOfDay, phase } = useTheme();
  const reminders = useReminders();
  const lock = useAppLock();
  const [lockNote, setLockNote] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState<null | 'export' | 'refresh' | 'delete'>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');

  const email = session?.user.email ?? '';
  const weeks = new Set(entries.map((e) => weekStartKey(e.date))).size;
  const canDelete = typed.trim().toLowerCase() === 'delete' && !busy;

  const run = async (kind: 'export' | 'refresh' | 'delete', work: () => Promise<void>) => {
    setBusy(kind);
    setMessage(null);
    try {
      await work();
    } catch {
      setMessage('That did not work. Please try again in a moment.');
    } finally {
      setBusy(null);
    }
  };

  const exportData = () =>
    run('export', async () => {
      const data = await api.exportData();
      await saveFile('lilac-pages-export.json', JSON.stringify(data, null, 2));
      setMessage(`Exported ${data.entries.length} entries.`);
    });

  const refresh = () =>
    run('refresh', async () => {
      let total = 0;
      for (;;) {
        const { updated, more } = await api.refreshInsights();
        total += updated;
        if (!more) break;
      }
      reload();
      setMessage(
        total ? `Updated ${total} older ${total === 1 ? 'entry' : 'entries'}.` : 'Everything is already up to date.',
      );
    });

  const deleteAccount = () =>
    run('delete', async () => {
      await api.deleteAccount();
      await signOut();
    });

  return (
    <Screen inTabs>
      <Container>
        <PageHeader />
        <Column className="pb-16">
          <Text accessibilityRole="header" className="text-4xl font-bold tracking-normal text-ink">
            Settings
          </Text>

          {/* Who you are, and a little of what you have built */}
          <Reveal style={{ marginTop: 24 }}>
            <View className="gap-5 rounded-3xl bg-sage p-5">
              <View className="flex-row items-center gap-4">
                <View className="h-14 w-14 items-center justify-center rounded-full bg-cream">
                  <Text className="text-2xl font-bold text-ink">{email.charAt(0).toUpperCase() || '·'}</Text>
                </View>
                <View className="flex-1">
                  <Text numberOfLines={1} className="text-lg font-semibold text-ink">
                    {email}
                  </Text>
                  {session?.user.created_at && (
                    <Text className="text-sm text-body">Writing here since {monthYear(session.user.created_at)}</Text>
                  )}
                </View>
              </View>
              <View className="flex-row gap-3">
                <Stat value={entries.length} label={entries.length === 1 ? 'entry' : 'entries'} />
                <Stat value={streak} label="day streak" />
                <Stat value={weeks} label={weeks === 1 ? 'week' : 'weeks'} />
              </View>
            </View>
          </Reveal>

          <View className="mt-8 gap-8">
            <Reveal delay={60}>
              <Card title="Appearance">
                <Row
                  first
                  icon="contrast"
                  tint="sun"
                  title="Theme"
                  description="Light, dark, or whatever your device is set to."
                  below={
                    <Segmented
                      fill
                      value={appearance}
                      onChange={setAppearance}
                      options={[
                        { value: 'light', label: 'Light' },
                        { value: 'dark', label: 'Dark' },
                        { value: 'system', label: 'System' },
                      ]}
                    />
                  }
                />
                <Row
                  icon="clock"
                  tint="sage"
                  title="Shift with the time of day"
                  description={
                    phase
                      ? `Warmer at golden hour, softer at night. ${PHASE_LABEL[phase]} are showing now.`
                      : 'Fresh in the morning, warmer at golden hour, softer at night.'
                  }
                  action={
                    <Switch
                      accessibilityLabel="Shift colors with the time of day"
                      value={timeOfDay}
                      onChange={setTimeOfDay}
                    />
                  }
                />
              </Card>
            </Reveal>

            {reminders.supported && (
              <Reveal delay={90}>
                <Card title="Reminders">
                  <Row
                    first
                    icon="bell"
                    tint="sun"
                    title="Daily reminder"
                    description="A gentle nudge to write. It skips days you have already written."
                    action={
                      <Switch
                        accessibilityLabel="Daily reminder"
                        value={reminders.prefs.enabled && reminders.permission === 'granted'}
                        onChange={async (on) => setBlocked(!(await reminders.setEnabled(on)))}
                      />
                    }
                  />
                  {reminders.prefs.enabled && reminders.permission === 'granted' && (
                    <Row
                      icon="clock"
                      tint="sage"
                      title="Remind me at"
                      below={
                        <Segmented
                          fill
                          value={String(reminders.prefs.hour)}
                          onChange={(h) => reminders.setHour(Number(h))}
                          options={REMINDER_TIMES.map((t) => ({ value: String(t.hour), label: t.label }))}
                        />
                      }
                    />
                  )}
                  {(blocked || (reminders.prefs.enabled && reminders.permission === 'denied')) && (
                    <Row
                      icon="bell"
                      tint="rose"
                      title="Notifications are off"
                      description="Allow notifications for Lilac Pages in your device settings to get reminders."
                      onPress={() => Linking.openSettings()}
                    />
                  )}
                </Card>
              </Reveal>
            )}

            {lock.supported && (
              <Reveal delay={100}>
                <Card title="Privacy">
                  <Row
                    first
                    icon="lock"
                    tint="sage"
                    title="App lock"
                    description="Ask for Face ID or your device passcode when you open Lilac Pages."
                    action={
                      <Switch
                        accessibilityLabel="App lock"
                        value={lock.enabled}
                        onChange={async (on) => {
                          const result = await lock.setEnabled(on);
                          setLockNote(
                            result === 'unavailable'
                              ? 'Set a passcode or Face ID on your device first, then turn this on.'
                              : null,
                          );
                        }}
                      />
                    }
                  />
                  {lockNote && (
                    <View className="border-t border-line bg-sage px-5 py-3">
                      <Text accessibilityRole="alert" className="text-sm text-sageInk">
                        {lockNote}
                      </Text>
                    </View>
                  )}
                </Card>
              </Reveal>
            )}

            <Reveal delay={120}>
              <Card title="Your data">
                <Row
                  first
                  icon="download"
                  tint="sage"
                  title="Download my data"
                  description="Everything you have written, with its scores, as a file you keep."
                  value={busy === 'export' ? 'Preparing…' : undefined}
                  onPress={exportData}
                  disabled={!!busy}
                />
                <Row
                  icon="refresh"
                  tint="track"
                  title="Update older entries"
                  description="Finds themes in entries written before themes existed. Their scores do not change."
                  value={busy === 'refresh' ? 'Working…' : undefined}
                  onPress={refresh}
                  disabled={!!busy}
                />
                {message && (
                  <View className="border-t border-line bg-sage px-5 py-3">
                    <Text accessibilityRole="alert" className="text-sm text-sageInk">
                      {message}
                    </Text>
                  </View>
                )}
              </Card>
            </Reveal>

            <Reveal delay={280}>
              <Card title="Account">
                <Row
                  first
                  icon="logout"
                  tint="track"
                  title="Sign out"
                  description="Sign out on this device. Your journal stays safe."
                  onPress={signOut}
                />
              </Card>
            </Reveal>

            <Reveal delay={360}>
              <Card title="Danger zone" tone="danger">
                <Row
                  first
                  danger
                  icon="trash"
                  tint="rose"
                  title="Delete my account"
                  description="Permanently deletes your account and every entry. This cannot be undone. Download your data first if you want to keep it."
                  onPress={confirming ? undefined : () => setConfirming(true)}
                  disabled={!!busy}
                />
                {confirming && (
                  <View className="gap-3 border-t border-roseLine px-5 py-5">
                    <Text className="text-sm leading-5 text-roseInk">Type delete to confirm.</Text>
                    <TextInput
                      value={typed}
                      onChangeText={setTyped}
                      autoCapitalize="none"
                      autoCorrect={false}
                      accessibilityLabel="Type delete to confirm"
                      className="h-11 rounded-xl border border-roseLine bg-cream px-4 text-base text-ink"
                      style={noOutline}
                    />
                    <View className="flex-row flex-wrap gap-3">
                      <Pressable
                        accessibilityRole="button"
                        disabled={!canDelete}
                        onPress={deleteAccount}
                        className={`h-10 items-center justify-center rounded-[10px] bg-roseInk px-[18px] ${canDelete ? '' : 'opacity-40'}`}
                      >
                        <Text className="text-sm font-semibold text-cream">
                          {busy === 'delete' ? 'Deleting…' : 'Delete everything'}
                        </Text>
                      </Pressable>
                      <Button
                        variant="ghost"
                        label="Cancel"
                        onPress={() => {
                          setConfirming(false);
                          setTyped('');
                        }}
                      />
                    </View>
                  </View>
                )}
              </Card>
            </Reveal>
          </View>

          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/privacy')}
            className="mt-10 self-center py-3"
          >
            <Text className="text-[13px] text-muted underline">Privacy and how your entries are used</Text>
          </Pressable>
        </Column>
      </Container>
    </Screen>
  );
}
