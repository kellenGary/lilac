import { Redirect, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { addDays, formatLong, weekNumber, weekRangeLabel, weekStartKey } from '@/lib/dates';
import { plantStateForWeek } from '@/lib/plant';
import { speciesForWeek, type PlantSpecies } from '@/lib/plantSpecies';
import { dailySeries } from '@/lib/series';
import { averageScores, SIGNALS } from '@/lib/signals';
import { summarizeWeek } from '@/lib/summary';
import { Container, EntryRow, PageHeader, Plant, Screen, ScoreBar, TrendChart, LoadingScreen } from '@/shared-components';
import { useEntries } from '@/state/entries';

/** Plants differ in height, so some leave more empty room above them in the drawing. Pull each up to the heading. */
const TOP_TRIM: Record<PlantSpecies, number> = {
  daisy: -8,
  fern: -8,
  succulent: -8,
  tulip: -8,
  monstera: -8,
  cactus: -62,
};

export function WeekPage() {
  const { start: raw } = useLocalSearchParams<{ start: string }>();
  const { status, entries } = useEntries();
  if (status !== 'ready') return <LoadingScreen />;
  if (!raw) return <Redirect href="/" />;

  const start = weekStartKey(raw);
  const inWeek = entries.filter((e) => weekStartKey(e.date) === start); // newest first
  if (inWeek.length === 0) return <Redirect href="/" />;

  const plant = plantStateForWeek(entries, start);
  const species = speciesForWeek(start);
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

        <View className="w-full max-w-[680px] items-center">
          <View className="w-72 max-w-full" style={{ marginTop: TOP_TRIM[species] }}>
            <Plant tight state={plant} species={species} sway />
          </View>
        </View>

        <View className="mt-6 flex-col gap-10">
          <View className="w-full max-w-[680px]">
            <View>
              <Text className="text-[15px] font-semibold text-ink">How the week moved</Text>
              <Text className="mb-3 mt-1 max-w-[52ch] text-[13px] leading-[19px] text-muted">{summarizeWeek(inWeek)}</Text>
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
        </View>
      </Container>
    </Screen>
  );
}
