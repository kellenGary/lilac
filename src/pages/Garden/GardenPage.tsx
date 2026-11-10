import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { weekNumber, weekRangeLabel, weekStartKey } from '@/lib/dates';
import { plantStateForWeek, vitalityLabel } from '@/lib/plant';
import { speciesForWeek } from '@/lib/plantSpecies';
import { Container, PageHeader, Plant, Reveal, Screen, LoadingScreen } from '@/shared-components';
import { useEntries } from '@/state/entries';

export function GardenPage() {
  const router = useRouter();
  const { status, entries } = useEntries();

  const weeks = useMemo(() => {
    const starts = [...new Set(entries.map((e) => weekStartKey(e.date)))].sort().reverse();
    return starts.map((start) => ({
      start,
      count: entries.filter((e) => weekStartKey(e.date) === start).length,
      plant: plantStateForWeek(entries, start),
    }));
  }, [entries]);

  if (status !== 'ready') return <LoadingScreen />;

  return (
    <Screen inTabs>
      <Container>
        <PageHeader />
        <Text accessibilityRole="header" className="text-4xl font-bold tracking-normal text-ink">
          Garden
        </Text>
        <Text className="mt-2 max-w-[52ch] text-base leading-6 text-muted">
          One plant for every week you wrote. Each grew from how that week read.
        </Text>

        {weeks.length === 0 ? (
          <Text className="mt-10 text-base text-muted">Your first plant appears after your first entry.</Text>
        ) : (
          <View className="-mx-2 mt-8 flex-row flex-wrap pb-16">
            {weeks.map((w, i) => (
              <View key={w.start} className="w-1/2 p-2 sm:w-1/3 lg:w-1/4">
                <Reveal delay={Math.min(i, 12) * 70}>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`Week ${weekNumber(w.start)}`}
                    onPress={() => router.push({ pathname: '/week/[start]', params: { start: w.start } })}
                    className="items-center rounded-3xl bg-surface px-3 pb-4 pt-3 hover:opacity-80"
                  >
                    <View className="w-full max-w-[180px]">
                      <Plant tight state={w.plant} species={speciesForWeek(w.start)} />
                    </View>
                    <Text className="mt-2 text-sm font-semibold text-ink">Week {weekNumber(w.start)}</Text>
                    <Text className="text-xs text-muted">{weekRangeLabel(w.start)}</Text>
                    <Text className="mt-1 text-xs text-muted">
                      {w.count} {w.count === 1 ? 'entry' : 'entries'} · {vitalityLabel(w.plant.vitality)}
                    </Text>
                  </Pressable>
                </Reveal>
              </View>
            ))}
          </View>
        )}
      </Container>
    </Screen>
  );
}
