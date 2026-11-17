import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, Text, TextInput, View, type TextStyle } from 'react-native';

import { formatLong, todayKey } from '@/lib/dates';
import { shiftMonths } from '@/lib/lookback';
import { getReminderPermission, remindersSupported, requestReminderPermission } from '@/lib/reminders';
import { Button, Column, Container, PageHeader, Screen } from '@/shared-components';
import { useLetters } from '@/state/letters';
import { useColors } from '@/state/theme';

const noOutline = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as unknown as TextStyle;
const WHEN = [
  { label: '1 month', months: 1 },
  { label: '3 months', months: 3 },
  { label: '6 months', months: 6 },
  { label: '1 year', months: 12 },
] as const;

/** Write a letter to be opened later. Sealed until the chosen day. */
export function NewLetterPage() {
  const router = useRouter();
  const { create } = useLetters();
  const { hint, line } = useColors();
  const [months, setMonths] = useState<number>(3);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = todayKey();
  const unlockOn = shiftMonths(today, months);

  const seal = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await create(text.trim(), unlockOn);
      // Offer a "your letter is ready" notification, but only ask once and only when asking is possible.
      if (remindersSupported && (await getReminderPermission()) === 'undetermined') {
        await requestReminderPermission().catch(() => false);
      }
      router.replace('/look-back');
    } catch {
      setError("We couldn't seal your letter. Your words are still here, so try again in a moment.");
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Container>
        <PageHeader back />
        <Column className="pb-16">
          <Text accessibilityRole="header" className="text-4xl font-bold tracking-normal text-ink">
            Letter to future you
          </Text>
          <Text className="mt-2 max-w-[56ch] text-base leading-6 text-muted">
            Write something now. It stays sealed until the day you choose, and nobody, including you, can read it
            before then.
          </Text>

          <Text className="mt-8 text-sm font-medium text-ink">Open it in</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {WHEN.map((w) => (
              <Pressable
                key={w.months}
                accessibilityRole="button"
                accessibilityState={{ selected: months === w.months }}
                onPress={() => setMonths(w.months)}
                className={`h-11 items-center justify-center rounded-full border px-5 ${
                  months === w.months ? 'border-ink bg-ink' : 'border-edge'
                }`}
              >
                <Text className={`text-sm font-semibold ${months === w.months ? 'text-cream' : 'text-ink'}`}>
                  {w.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text className="mt-2 text-sm text-muted">Opens {formatLong(unlockOn)}</Text>

          <TextInput
            multiline
            value={text}
            onChangeText={setText}
            placeholder="What do you want to remember? What are you hoping for?"
            placeholderTextColor={hint}
            accessibilityLabel="Your letter"
            className="mt-6 min-h-[260px] rounded-2xl border bg-surface p-4 text-[17px] leading-7 text-ink"
            style={[{ textAlignVertical: 'top', borderColor: line }, noOutline]}
          />

          {error && (
            <Text accessibilityRole="alert" className="mt-3 text-sm text-roseInk">
              {error}
            </Text>
          )}
          <Button
            size="lg"
            className="mt-6 w-full"
            label={busy ? 'Sealing…' : 'Seal letter'}
            onPress={seal}
            disabled={!text.trim() || busy}
          />
        </Column>
      </Container>
    </Screen>
  );
}
