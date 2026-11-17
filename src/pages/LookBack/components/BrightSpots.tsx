import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { formatLong } from '@/lib/dates';
import type { BrightSpot } from '@/lib/lookback';
import { useColors } from '@/state/theme';

/** Lines from your own entries that were about purpose, gratitude or the people who matter to you. */
export function BrightSpots({ spots }: { spots: BrightSpot[] }) {
  const router = useRouter();
  const { lilac } = useColors();
  if (spots.length === 0) {
    return (
      <Text className="max-w-[52ch] text-base leading-6 text-muted">
        Lines about what mattered to you collect here as you write.
      </Text>
    );
  }
  return (
    <View className="gap-4">
      {spots.map((s) => (
        <Pressable
          key={s.date}
          accessibilityRole="link"
          onPress={() => router.push({ pathname: '/entry/[date]', params: { date: s.date } })}
          className="flex-row gap-3.5 hover:opacity-70"
        >
          <View style={{ width: 2, alignSelf: 'stretch', borderRadius: 1, backgroundColor: lilac }} />
          <View className="flex-1 gap-1 py-0.5">
            <Text className="text-[17px] leading-[26px] text-ink">“{s.text}”</Text>
            <Text className="text-xs text-muted">{formatLong(s.date)}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}
