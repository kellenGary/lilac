import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { formatLong, fromKey } from '@/lib/dates';
import { feelingLabel } from '@/lib/feeling';
import type { WeekRecap as Recap } from '@/lib/lookback';
import { feelingOf } from '@/lib/orbs';
import { themeLabel } from '@/lib/themes';
import type { Entry } from '@/lib/types';
import { Face } from '@/shared-components/Face';

const weekday = (key: string) => fromKey(key).toLocaleDateString('en-US', { weekday: 'long' });

function DayRow({ title, entry }: { title: string; entry: Entry }) {
  const router = useRouter();
  const level = feelingOf(entry);
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push({ pathname: '/entry/[date]', params: { date: entry.date } })}
      className="flex-row items-center gap-3 py-1.5 hover:opacity-70"
    >
      <Face level={level} size={30} />
      <View className="flex-1">
        <Text className="text-xs uppercase tracking-widest text-muted">{title}</Text>
        <Text className="text-base text-ink">
          {weekday(entry.date)}, {feelingLabel(level).toLowerCase()}
        </Text>
      </View>
    </Pressable>
  );
}

/** The week so far: how much you wrote, what came up, the lightest and heaviest day, and one line that mattered. */
export function WeekRecap({ recap, isSunday }: { recap: Recap | null; isSunday: boolean }) {
  const router = useRouter();
  if (!recap) {
    return (
      <View className="rounded-3xl bg-surface p-6">
        <Text className="text-base leading-6 text-body">
          Nothing written yet this week. Your recap appears here after your first entry.
        </Text>
      </View>
    );
  }
  const { daysWritten, daysSoFar, topThemes, brightest, heaviest, phrase } = recap;
  return (
    <View className="gap-5 rounded-3xl bg-sun p-6">
      <View>
        <Text className="text-xs font-semibold uppercase tracking-widest text-body">
          {isSunday ? 'Your week' : 'This week so far'}
        </Text>
        <Text className="mt-1.5 text-2xl font-bold tracking-tight text-ink">
          {daysWritten} {daysWritten === 1 ? 'day' : 'days'} written
        </Text>
        <View className="mt-3 flex-row gap-1.5" accessibilityLabel={`${daysWritten} of ${daysSoFar} days so far`}>
          {Array.from({ length: 7 }, (_, i) => (
            <View
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i < daysWritten ? 'bg-ink' : i < daysSoFar ? 'bg-edge' : 'bg-line'
              }`}
            />
          ))}
        </View>
      </View>

      {topThemes.length > 0 && (
        <View>
          <Text className="text-xs uppercase tracking-widest text-body">Came up most</Text>
          <Text className="mt-1 text-base leading-6 text-ink">
            {topThemes.map((t) => themeLabel(t.theme)).join(', ')}
          </Text>
        </View>
      )}

      {(brightest || heaviest) && (
        <View>
          {brightest && <DayRow title="Lightest day" entry={brightest} />}
          {heaviest && <DayRow title="Heaviest day" entry={heaviest} />}
        </View>
      )}

      {phrase && (
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push({ pathname: '/entry/[date]', params: { date: phrase.date } })}
          className="border-t border-edge pt-4 hover:opacity-70"
        >
          <Text className="text-xs uppercase tracking-widest text-body">Something that mattered</Text>
          <Text className="mt-1.5 text-lg leading-7 text-ink">“{phrase.text}”</Text>
          <Text className="mt-1 text-xs text-body">{formatLong(phrase.date)}</Text>
        </Pressable>
      )}
    </View>
  );
}
