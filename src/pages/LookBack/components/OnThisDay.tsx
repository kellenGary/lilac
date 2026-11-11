import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { formatLong } from '@/lib/dates';
import type { Memory } from '@/lib/lookback';
import { feelingOf } from '@/lib/orbs';
import { Face } from '@/shared-components/Face';

/** Entries from a week, months or years ago. Appears as the journal grows. */
export function OnThisDay({ memories }: { memories: Memory[] }) {
  const router = useRouter();
  if (memories.length === 0) {
    return (
      <Text className="max-w-[52ch] text-base leading-6 text-muted">
        Nothing from this day yet. Entries from a week, a month or a year ago show up here as your journal grows.
      </Text>
    );
  }
  return (
    <View className="gap-3">
      {memories.map(({ label, entry }) => (
        <Pressable
          key={entry.date}
          accessibilityRole="link"
          onPress={() => router.push({ pathname: '/entry/[date]', params: { date: entry.date } })}
          className="gap-2 rounded-3xl bg-surface p-5 hover:opacity-80"
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</Text>
            <Face level={feelingOf(entry)} size={26} />
          </View>
          <Text className="text-sm font-semibold text-ink">{formatLong(entry.date)}</Text>
          <Text numberOfLines={4} className="text-base leading-6 text-ink opacity-70">
            {entry.text.replace(/\n+/g, ' ')}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
