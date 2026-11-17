import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { addDays, formatLong, weekStartKey } from '@/lib/dates';
import { useEntries } from '@/state/entries';
import { useColors } from '@/state/theme';

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * This week at a glance: a circle for each day. Days you wrote are filled with lilac (tap to read them), today has an
 * extra ring, and days still to come are faint.
 */
export function WeekDots() {
  const router = useRouter();
  const { today, getEntry } = useEntries();
  const { ink, lilac, line } = useColors();
  const start = weekStartKey(today);

  return (
    <View className="flex-row justify-between" accessibilityRole="list">
      {LETTERS.map((letter, i) => {
        const day = addDays(start, i);
        const written = !!getEntry(day);
        const isToday = day === today;
        const future = day > today;
        return (
          <Pressable
            key={day}
            accessibilityRole={written ? 'link' : 'text'}
            accessibilityLabel={`${formatLong(day)}${written ? ', written' : future ? '' : ', not written'}`}
            disabled={!written}
            onPress={() => router.push({ pathname: '/entry/[date]', params: { date: day } })}
            className="items-center gap-1.5 px-0.5 py-1 hover:opacity-70"
          >
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                borderWidth: 1.5,
                borderColor: future ? line : ink,
                backgroundColor: written ? lilac : 'transparent',
                // A ring a little out from the circle marks today.
                ...(isToday ? { outlineWidth: 1.5, outlineColor: ink, outlineOffset: 3, outlineStyle: 'solid' } : null),
              }}
            />
            <Text className="text-[10px] font-semibold tracking-[0.4px] text-purple">{letter}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
