import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { formatLong } from '@/lib/dates';
import { splitMatches } from '@/lib/search';
import type { Entry } from '@/lib/types';
import { feelingOf } from '@/lib/orbs';
import { Face } from './Face';

/**
 * One entry in a list: date, the face for how the day felt, and a faded excerpt. Opens the entry.
 * For search results, pass the passage to show and the query to mark in it.
 */
export function EntryRow({
  entry,
  excerpt,
  highlight,
}: {
  entry: Entry;
  excerpt?: string;
  highlight?: string;
}) {
  const router = useRouter();
  const shown = excerpt ?? entry.text.replace(/\n+/g, ' ');
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push({ pathname: '/entry/[date]', params: { date: entry.date } })}
      className="border-t border-line py-4 hover:opacity-70"
    >
      <View className="mb-1.5 flex-row items-center gap-2.5">
        <Text className="text-[15px] font-semibold text-ink">{formatLong(entry.date)}</Text>
        <Face level={feelingOf(entry)} size={22} />
      </View>
      <Text numberOfLines={2} className="max-w-[60ch] text-[15px] leading-[22px] text-ink opacity-75">
        {(highlight ? splitMatches(shown, highlight) : [{ text: shown, match: false }]).map((p, i) =>
          p.match ? (
            <Text key={i} className="bg-sun text-ink">
              {p.text}
            </Text>
          ) : (
            p.text
          ),
        )}
      </Text>
    </Pressable>
  );
}
