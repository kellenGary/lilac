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
    <View className="rounded-[22px] border border-line bg-surface px-5">
      {memories.map(({ label, entry }, i) => (
        <Pressable
          key={entry.date}
          accessibilityRole="link"
          onPress={() => router.push({ pathname: '/entry/[date]', params: { date: entry.date } })}
          className={`py-4 hover:opacity-70 ${i > 0 ? 'border-t border-line' : ''}`}
        >
          <View className="mb-1.5 flex-row items-center gap-2.5">
            <Text className="text-[15px] font-semibold text-ink">{formatLong(entry.date)}</Text>
            <Face level={feelingOf(entry)} size={22} />
            <Text className="ml-auto text-[11px] font-semibold uppercase tracking-[1.3px] text-purple">{label}</Text>
          </View>
          <Text numberOfLines={2} className="text-[15px] leading-[22px] text-ink opacity-75">
            {entry.text.replace(/\n+/g, ' ')}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
