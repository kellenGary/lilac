import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { weekNumber, weekRangeLabel, weekStartKey } from '@/lib/dates';
import { plantStateForWeek, vitalityLabel } from '@/lib/plant';
import { speciesForWeek } from '@/lib/plantSpecies';
import { Plant } from '@/shared-components';
import { useEntries } from '@/state/entries';

const FIRST = 4;

/** One plant for every week you wrote, each grown from how that week read. Tap one to open the week. */
export function GardenSection() {
  const router = useRouter();
  const { entries } = useEntries();
  const [all, setAll] = useState(false);

  const weeks = useMemo(() => {
    const starts = [...new Set(entries.map((e) => weekStartKey(e.date)))].sort().reverse();
    return starts.map((start) => ({
      start,
      count: entries.filter((e) => weekStartKey(e.date) === start).length,
      plant: plantStateForWeek(entries, start),
    }));
  }, [entries]);

  if (weeks.length === 0) return null;
  const shown = all ? weeks : weeks.slice(0, FIRST);

  return (
    <View>
      <Text accessibilityRole="header" className="text-xl font-semibold text-ink">
        Your garden
      </Text>
      <Text className="mt-1 max-w-[52ch] text-sm leading-5 text-purple">
        One plant for every week you wrote. Each grew from how that week read.
      </Text>
      <View className="-mx-1.5 mt-4 flex-row flex-wrap">
        {shown.map((w) => (
          <View key={w.start} className="w-1/2 p-1.5">
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Week ${weekNumber(w.start)}`}
              onPress={() => router.push({ pathname: '/week/[start]', params: { start: w.start } })}
              className="items-center rounded-3xl border border-line bg-surface px-3 pb-4 pt-3 hover:opacity-80"
            >
              <View className="w-full max-w-[140px]">
                <Plant tight state={w.plant} species={speciesForWeek(w.start)} />
              </View>
              <Text className="mt-2 text-sm font-semibold text-ink">Week {weekNumber(w.start)}</Text>
              <Text className="text-xs text-purple">{weekRangeLabel(w.start)}</Text>
              <Text className="mt-1 text-xs text-muted">
                {w.count} {w.count === 1 ? 'entry' : 'entries'} · {vitalityLabel(w.plant.vitality)}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
      {weeks.length > FIRST && (
        <Pressable accessibilityRole="button" onPress={() => setAll((v) => !v)} className="mt-2 self-start py-2 hover:opacity-70">
          <Text className="text-sm font-semibold text-ink underline">{all ? 'Show fewer' : `Show all ${weeks.length} weeks`}</Text>
        </Pressable>
      )}
    </View>
  );
}
