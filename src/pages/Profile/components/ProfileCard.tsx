import { useState } from 'react';
import { Platform, Pressable, Text, TextInput, View, type TextStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { cleanName, MAX_NAME } from '@/lib/names';
import { useAuth } from '@/state/auth';
import { useColors, useTheme } from '@/state/theme';

const noOutline = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as unknown as TextStyle;
const TINT = { light: '#EEE7F7', dark: '#2A2540' };

const monthYear = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';

function Stat({ value, label, first }: { value: number; label: string; first?: boolean }) {
  const { line } = useColors();
  return (
    <View className="flex-1 items-center" style={first ? undefined : { borderLeftWidth: 1, borderLeftColor: line }}>
      <Text className="text-[28px] font-semibold leading-8 tracking-tight text-ink">{value}</Text>
      <Text className="mt-0.5 text-[12.5px] text-purple">{label}</Text>
    </View>
  );
}

/**
 * Who you are: a lilac initial, your first name (which you can change), when you started, and three numbers about
 * your writing. One flat tint, thin lines, nothing heavy.
 */
export function ProfileCard({ entries, streak, weeks }: { entries: number; streak: number; weeks: number }) {
  const { session, firstName, setFirstName } = useAuth();
  const { ink, lilac, purple, line } = useColors();
  const { isDark } = useTheme();
  const email = session?.user.email ?? '';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initial = (firstName || email).charAt(0).toUpperCase() || '·';
  const startEditing = () => {
    setDraft(firstName);
    setError(null);
    setEditing(true);
  };
  const save = async () => {
    const name = cleanName(draft);
    if (!name || busy) return;
    setBusy(true);
    setError(null);
    try {
      await setFirstName(name);
      setEditing(false);
    } catch {
      setError("That didn't save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="rounded-[26px] px-5 pb-5 pt-5" style={{ backgroundColor: isDark ? TINT.dark : TINT.light }}>
      <View className="flex-row items-center gap-4">
        <View
          className="h-[58px] w-[58px] items-center justify-center rounded-full"
          style={{ backgroundColor: lilac, borderWidth: 1.5, borderColor: ink }}
        >
          <Text className="text-[24px] font-semibold text-ink">{initial}</Text>
        </View>

        {editing ? (
          <View className="flex-1 gap-2">
            <TextInput
              autoFocus
              value={draft}
              onChangeText={setDraft}
              maxLength={MAX_NAME}
              placeholder="Your first name"
              placeholderTextColor={`${purple}88`}
              accessibilityLabel="Your first name"
              autoCapitalize="words"
              autoComplete="given-name"
              textContentType="givenName"
              returnKeyType="done"
              onSubmitEditing={save}
              className="rounded-xl border bg-surface px-3.5 py-2.5 text-[17px] text-ink"
              style={[{ borderColor: line }, noOutline]}
            />
            <View className="flex-row items-center gap-5">
              <Pressable accessibilityRole="button" onPress={save} disabled={!cleanName(draft) || busy} className="py-1">
                <Text className={`text-[14px] font-semibold text-ink underline ${!cleanName(draft) || busy ? 'opacity-40' : ''}`}>
                  {busy ? 'Saving…' : 'Save'}
                </Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setEditing(false)} className="py-1">
                <Text className="text-[14px] text-muted underline">Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <View className="flex-1">
              {firstName ? (
                <Text numberOfLines={1} className="text-[26px] font-semibold leading-8 tracking-tight text-ink">
                  {firstName}
                </Text>
              ) : (
                <Pressable accessibilityRole="button" onPress={startEditing}>
                  <Text className="text-[20px] font-semibold text-purple underline">Add your name</Text>
                </Pressable>
              )}
              {session?.user.created_at && (
                <Text className="mt-0.5 text-[13px] text-purple">Writing since {monthYear(session.user.created_at)}</Text>
              )}
              <Text numberOfLines={1} className="mt-0.5 text-[12.5px] text-muted">
                {email}
              </Text>
            </View>
            {firstName ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change your name"
                onPress={startEditing}
                className="h-10 w-10 items-center justify-center rounded-full border hover:opacity-70"
                style={{ borderColor: line }}
              >
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4"
                    stroke={ink}
                    strokeWidth={1.9}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </Pressable>
            ) : null}
          </>
        )}
      </View>
      {error && (
        <Text accessibilityRole="alert" className="mt-3 text-[13px] text-roseInk">
          {error}
        </Text>
      )}

      <View className="mb-1 mt-5 flex-row border-t pt-4" style={{ borderTopColor: isDark ? '#3F3858' : '#DDD3EE' }}>
        <Stat first value={entries} label={entries === 1 ? 'entry' : 'entries'} />
        <Stat value={streak} label="day streak" />
        <Stat value={weeks} label={weeks === 1 ? 'week' : 'weeks'} />
      </View>
    </View>
  );
}
