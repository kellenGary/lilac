import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { useTween } from '@/lib/animation';
import { formatLong, formatShort, weekStartKey } from '@/lib/dates';
import { plantStateForWeek, vitalityLabel } from '@/lib/plant';
import { speciesForWeek } from '@/lib/plantSpecies';
import { dailySeries } from '@/lib/series';
import { SIGNALS } from '@/lib/signals';
import { compareFeeling, feelingLabel, readAsFeeling } from '@/lib/feeling';
import { Button, Container, Face, Plant, Reveal, Screen, ScoreBar, TrendChart, Wordmark, LoadingScreen } from '@/shared-components';
import { useEntries } from '@/state/entries';

/**
 * The closing moment after "Finish entry": scores fill in, the 14-day trend draws itself, and the
 * week's plant grows a new leaf. Timings are in ms from mount.
 */
export function FinishPage() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date: string }>();
  const { status, entries, streak, getEntry } = useEntries();
  const entry = date ? getEntry(date) : undefined;

  const reveal = useTween(2200, 1400);
  const progress = useTween(1000, 3600);

  // The plant is drawn from this week's average. Show it as it was before this entry, then update it.
  const weekEntries = entry ? entries.filter((e) => weekStartKey(e.date) === weekStartKey(entry.date)) : [];
  const weekStart = entry ? weekStartKey(entry.date) : '';
  const before = plantStateForWeek(entries, weekStart, entry?.date);
  const after = plantStateForWeek(entries, weekStart);
  const species = weekStart ? speciesForWeek(weekStart) : 'daisy';

  if (status !== 'ready') return <LoadingScreen />;
  if (!entry) return <Redirect href="/" />;

  const series = dailySeries(entries, entry.date, 14);
  const weekCount = weekEntries.length;
  const change =
    after.vitality - before.vitality > 0.02
      ? 'Grew'
      : after.vitality - before.vitality < -0.02
        ? 'Wilted a little'
        : 'Holding steady';

  return (
    <Screen>
      <Container>
        <View className="h-[60px] flex-row items-center">
          <Wordmark />
        </View>

        <View className="w-full max-w-[880px] self-center pt-10 lg:pt-16">
          <Reveal>
            <Text className="text-[13px] font-semibold uppercase tracking-widest text-muted">
              {formatLong(entry.date)} · Entry saved
            </Text>
            <Text
              accessibilityRole="header"
              className="mt-2.5 text-[32px] font-bold leading-9 tracking-normal text-ink sm:text-[42px] sm:leading-[46px]"
            >
              Here&apos;s how today read
            </Text>
          </Reveal>

          <View className="mt-11 flex-col gap-8 sm:flex-row sm:gap-6 lg:gap-10">
            {SIGNALS.map((s, i) => (
              <Reveal key={s.key} delay={300 + i * 200} style={{ flex: 1 }}>
                <ScoreBar signal={s.key} value={entry.scores[s.key]} size="lg" from={0} delay={500 + i * 200} />
              </Reveal>
            ))}
          </View>

          {entry.feeling !== null && (
            <Reveal delay={1000} style={{ marginTop: 32 }}>
              <View className="gap-4 rounded-3xl bg-surface p-5">
                <View className="flex-row items-center gap-6">
                  <View className="items-center gap-1.5">
                    <Face level={entry.feeling} size={44} />
                    <Text className="text-xs text-muted">You felt</Text>
                    <Text className="text-sm font-semibold text-ink">{feelingLabel(entry.feeling)}</Text>
                  </View>
                  <Text className="text-xl text-muted">↔</Text>
                  <View className="items-center gap-1.5">
                    <Face level={readAsFeeling(entry.scores)} size={44} />
                    <Text className="text-xs text-muted">It read as</Text>
                    <Text className="text-sm font-semibold text-ink">{feelingLabel(readAsFeeling(entry.scores))}</Text>
                  </View>
                </View>
                <Text className="max-w-[48ch] text-[15px] leading-[22px] text-body">
                  {compareFeeling(entry.feeling, readAsFeeling(entry.scores))}
                </Text>
              </View>
            </Reveal>
          )}

          {entries.length === 1 && (
            <Reveal delay={1100} style={{ marginTop: 32 }}>
              <Text className="max-w-[56ch] text-base leading-6 text-body">
                That is your first reading. Each score comes from the words you wrote, so it can change if you edit the
                entry. As you keep writing, a trend and this week&apos;s plant take shape.
              </Text>
            </Reveal>
          )}

          <View className="mt-12 flex-col gap-10 border-t border-line pt-8 lg:flex-row lg:gap-12">
            <View className="min-w-0 flex-1">
              <Reveal delay={1200}>
                <View className="mb-3.5 flex-row flex-wrap items-baseline justify-between gap-2">
                  <Text className="text-[15px] font-semibold text-ink">Last 14 days</Text>
                  <View className="flex-row gap-3.5">
                    {SIGNALS.map((s) => (
                      <View key={s.key} className="flex-row items-center gap-1.5">
                        <View className="h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} />
                        <Text className="text-xs text-muted">{s.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Reveal>
              <TrendChart series={series} height={190} reveal={reveal} endDots />
              <View className="mt-1.5 flex-row justify-between">
                <Text className="text-[11px] text-muted">{formatShort(series.keys[0])}</Text>
                <Text className="text-[11px] font-semibold text-ink">Today</Text>
              </View>
            </View>

            <View className="w-60 self-center lg:self-auto">
              <View className="mb-1 flex-row items-baseline justify-between">
                <Text className="text-[15px] font-semibold text-ink">This week&apos;s plant</Text>
                <Text className="text-[13px] text-muted" style={{ opacity: progress }}>
                  {change}
                </Text>
              </View>
              <Plant state={after} species={species} from={before} delay={3600} />
              <View className="mt-2.5 h-1 rounded-sm bg-track">
                <View
                  className="h-1 rounded-sm bg-meaning"
                  style={{ width: `${Math.min(100, ((weekCount - 1 + progress) / 7) * 100)}%` }}
                />
              </View>
              <Text className="mt-2 text-[13px] text-muted">
                {weekCount} of 7 entries. {vitalityLabel(after.vitality)} on this week&apos;s average.
              </Text>
            </View>
          </View>

          <Reveal delay={4200} style={{ marginTop: 44 }}>
            <View className="flex-row flex-wrap items-center gap-5">
              <Button size="lg" label="Back to journal" onPress={() => router.replace('/')} />
              <Text className="text-sm text-muted">
                Your streak is now {streak} {streak === 1 ? 'day' : 'days'}
              </Text>
            </View>
          </Reveal>
        </View>
      </Container>
    </Screen>
  );
}
