import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useTween, useTweenedNumber } from '@/lib/animation';
import { formatLong, formatShort, weekNumber, weekRangeLabel, weekStartKey } from '@/lib/dates';
import { plantStateForWeek, vitalityLabel } from '@/lib/plant';
import { speciesForWeek } from '@/lib/plantSpecies';
import { dailySeries, weeklySeries } from '@/lib/series';
import { Button, Plant, Segmented, TrendChart } from '@/shared-components';
import { useEntries } from '@/state/entries';
import { useTransition } from '@/state/transition';

type Mode = 'day' | 'week';

/** How many entries this week, for the streak line and the plant. */
function useWeekCount() {
  const { entries, today } = useEntries();
  const thisWeek = weekStartKey(today);
  return entries.filter((e) => weekStartKey(e.date) === thisWeek).length;
}

/** The write button and the streak: the part of the sidebar that is always worth seeing first. */
export function SidebarActions() {
  const router = useRouter();
  const { go } = useTransition();
  const { today, streak, getEntry } = useEntries();
  const streakShown = Math.round(useTweenedNumber(streak, 1000, 250, 0));
  const weekCount = useWeekCount();
  const written = !!getEntry(today);

  return (
    <View>
      <Button
        size="lg"
        label={written ? "View today's entry" : "Write today's entry"}
        onPress={(e) =>
          written
            ? router.push({
                pathname: '/entry/[date]',
                params: { date: today },
              })
            : go(
                '/write',
                Number.isFinite(e.nativeEvent.pageX) ? { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY } : undefined,
              )
        }
      />

      <View className="flex-row items-baseline gap-2.5 border-b border-line pb-6 pt-7">
        <Text className="text-5xl font-bold leading-[48px] tracking-tighter text-ink">{streakShown}</Text>
        <Text className="text-[15px] text-body">{streak === 0 ? 'day streak. Start one today' : 'day streak'}</Text>
        <Text className="ml-auto text-[13px] text-muted">
          Week {weekNumber(today)}, {weekCount} of 7
        </Text>
      </View>
    </View>
  );
}

/** The trend chart with its Day / Week switch. Shared by the desktop sidebar and the phone summary card. */
function TrendPanel() {
  const { entries, today } = useEntries();
  const [mode, setMode] = useState<Mode>('day');

  const series = mode === 'day' ? dailySeries(entries, today, 14) : weeklySeries(entries, today, 8);
  const firstLabel = formatShort(series.keys[0]);
  const lastLabel = mode === 'day' ? 'Today' : 'This week';

  return (
    <View>
      <View className="mb-3.5 flex-row items-center justify-between">
        <Text className="text-[15px] font-semibold text-ink">Trend</Text>
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'day', label: 'Day' },
            { value: 'week', label: 'Week' },
          ]}
        />
      </View>
      {entries.length < 2 ? (
        <View className="h-[170px] items-center justify-center rounded-xl border border-dashed border-line px-6">
          <Text className="text-center text-sm leading-5 text-muted">
            {entries.length === 0
              ? 'Your trend will appear here once you have written a couple of entries.'
              : 'One entry down. Your trend appears after the next one.'}
          </Text>
        </View>
      ) : (
        <>
          <TrendChart
            key={mode}
            series={series}
            animateOnMount
            labelFor={mode === 'day' ? formatLong : (k) => `Week ${weekNumber(k)}, ${weekRangeLabel(k)}`}
          />
          <View className="mt-1 flex-row justify-between">
            <Text className="text-[11px] text-muted">{firstLabel}</Text>
            <Text className="text-[11px] text-muted">{lastLabel}</Text>
          </View>
        </>
      )}
    </View>
  );
}

/** This week's plant, large, with its progress bar. For the desktop sidebar. */
function PlantPanel() {
  const { entries, today } = useEntries();
  const barFill = useTween(1000, 600);
  const weekCount = useWeekCount();
  const plant = plantStateForWeek(entries, weekStartKey(today));
  const species = speciesForWeek(weekStartKey(today));

  return (
    <View>
      <View className="mb-2 flex-row items-baseline justify-between">
        <Text className="text-[15px] font-semibold text-ink">This week&apos;s plant</Text>
        <Text className="text-[13px] text-muted">
          {weekCount === 0 ? 'Not planted yet' : vitalityLabel(plant.vitality)}
        </Text>
      </View>
      <View className="w-48 self-center">
        <Plant tight state={plant} species={species} sway />
      </View>
      <View className="mt-3.5 h-1 rounded-sm bg-track">
        <View
          className="h-1 rounded-sm bg-meaning"
          style={{
            width: `${Math.min(100, (weekCount / 7) * 100) * barFill}%`,
          }}
        />
      </View>
      <Text className="mt-2 text-[13px] text-muted">
        {weekCount === 0
          ? "Write today's entry to plant this week's seed."
          : `${weekCount} of 7 entries. Shaped by your average so far.`}
      </Text>
    </View>
  );
}

/** The trend chart and this week's plant, stacked, for the desktop sidebar. */
export function SidebarInsights() {
  return (
    <View>
      <View className="border-b border-line pb-6 pt-5">
        <TrendPanel />
      </View>
      <View className="pt-5">
        <PlantPanel />
      </View>
    </View>
  );
}

/**
 * Phones and tablets: one card near the top of the page, so the plant and trend stay one glance away however many
 * entries there are. It shows this week's plant and status, with the trend chart below.
 */
export function MobileInsights() {
  const { entries, today } = useEntries();
  const weekCount = useWeekCount();
  const plant = plantStateForWeek(entries, weekStartKey(today));
  const species = speciesForWeek(weekStartKey(today));

  return (
    <View className="overflow-hidden rounded-3xl border border-line bg-surface">
      <View className="flex-row items-center gap-4 p-4">
        <View className="w-20">
          <Plant tight state={plant} species={species} sway />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="text-xs font-semibold uppercase tracking-widest text-muted">This week&apos;s plant</Text>
          <Text className="text-lg font-semibold text-ink">
            {weekCount === 0 ? 'Not planted yet' : vitalityLabel(plant.vitality)}
          </Text>
          <Text className="text-[13px] text-muted">
            {weekCount === 0 ? "Write today's entry to plant it." : `${weekCount} of 7 entries`}
          </Text>
        </View>
      </View>
      <View className="border-t border-line px-4 pb-5 pt-4">
        <TrendPanel />
      </View>
    </View>
  );
}

/** Both parts together, for the desktop sidebar. */
export function Sidebar() {
  return (
    <View>
      <SidebarActions />
      <SidebarInsights />
    </View>
  );
}
