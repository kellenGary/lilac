import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { formatLong } from '@/lib/dates';
import type { BrightSpot } from '@/lib/lookback';
import { signalColor } from '@/lib/signals';

/** Lines from your own entries that were about purpose, gratitude or the people who matter to you. */
export function BrightSpots({ spots }: { spots: BrightSpot[] }) {
  const router = useRouter();
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
          className="flex-row gap-4 hover:opacity-70"
        >
          <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: signalColor('meaning') }} />
          <View className="flex-1 gap-1 py-0.5">
            <Text className="text-lg leading-7 text-ink">“{s.text}”</Text>
            <Text className="text-xs text-muted">{formatLong(s.date)}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}
