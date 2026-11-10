import { Redirect, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { addDays, formatLong, weekNumber, weekRangeLabel, weekStartKey } from '@/lib/dates';
import { plantStateForWeek, vitalityLabel } from '@/lib/plant';
import { speciesForWeek } from '@/lib/plantSpecies';
import { dailySeries } from '@/lib/series';
import { averageScores, SIGNALS } from '@/lib/signals';
import { summarizeWeek } from '@/lib/summary';
import { Container, EntryRow, PageHeader, Plant, Screen, ScoreBar, TrendChart, LoadingScreen } from '@/shared-components';
import { useEntries } from '@/state/entries';

export function WeekPage() {
  const { start: raw } = useLocalSearchParams<{ start: string }>();
  const { status, entries } = useEntries();
  if (status !== 'ready') return <LoadingScreen />;
  if (!raw) return <Redirect href="/garden" />;

  const start = weekStartKey(raw);
  const inWeek = entries.filter((e) => weekStartKey(e.date) === start); // newest first
  if (inWeek.length === 0) return <Redirect href="/garden" />;

  const plant = plantStateForWeek(entries, start);
  const avg = averageScores(inWeek.map((e) => e.scores));
  const series = dailySeries(entries, addDays(start, 6), 7);

  return (
    <Screen>
      <Container>
        <PageHeader back />
        <Text className="text-xs font-semibold uppercase tracking-widest text-muted">{weekRangeLabel(start)}</Text>
        <Text accessibilityRole="header" className="mt-1 text-4xl font-bold tracking-normal text-ink">
          Week {weekNumber(start)}
        </Text>

        <View className="mt-8 flex-col items-center gap-10 lg:flex-row lg:items-start lg:gap-16">
          <View className="w-full max-w-[680px] lg:flex-1">
            <Text className="max-w-[52ch] text-base leading-6 text-body">{summarizeWeek(inWeek)}</Text>

            <View className="mt-8">
              <Text className="mb-3 text-[15px] font-semibold text-ink">How the week moved</Text>
              <TrendChart series={series} animateOnMount labelFor={formatLong} />
              <View className="mt-1 flex-row justify-between">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <Text key={i} className="text-[11px] text-muted">
                    {d}
                  </Text>
                ))}
              </View>
            </View>

            <View className="mt-10 border-t border-line pt-6">
              <Text className="mb-5 text-[15px] font-semibold text-ink">Average</Text>
              <View className="gap-5">
                {SIGNALS.map((s, i) => (
                  <ScoreBar key={s.key} signal={s.key} value={avg[s.key]} from={0} delay={250 + i * 150} />
                ))}
              </View>
            </View>

            <View className="mt-10 border-t border-line pt-6">
              <Text className="mb-4 text-[15px] font-semibold text-ink">Entries</Text>
              {inWeek.map((e) => (
                <EntryRow key={e.date} entry={e} />
              ))}
            </View>
          </View>

          <View className="w-full max-w-[680px] items-center lg:w-[340px] lg:max-w-[340px]">
            <View className="w-72 max-w-full">
              <Plant state={plant} species={speciesForWeek(start)} sway />
            </View>
            <Text className="mt-2 text-[15px] font-semibold text-ink">{vitalityLabel(plant.vitality)}</Text>
            <Text className="text-[13px] text-muted">{inWeek.length} of 7 entries</Text>
          </View>
        </View>
      </Container>
    </Screen>
  );
}
