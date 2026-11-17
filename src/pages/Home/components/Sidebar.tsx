import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTween, useTweenedNumber } from '@/lib/animation';
import { formatLong, formatShort, weekNumber, weekRangeLabel, weekStartKey } from '@/lib/dates';
import { plantStateForWeek, vitalityLabel } from '@/lib/plant';
import { speciesForWeek } from '@/lib/plantSpecies';
import { dailySeries, weeklySeries } from '@/lib/series';
import { signalColor } from '@/lib/signals';
import { Button, Plant, Segmented, TrendChart } from '@/shared-components';
import { DateCard } from './DateCard';
import { WeekDots } from './WeekDots';
import { useEntries } from '@/state/entries';
import { useColors } from '@/state/theme';
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
      <View className="mb-4">
        <DateCard today={today} />
      </View>
      <Button
        size="lg"
        label={written ? "View today's entry" : "Write today's entry"}
        onPress={(e) =>
          written
            ? router.push({
                pathname: '/entry/[date]',
                params: {
                  date: today,
                },
              })
            : go(
                '/write',
                Number.isFinite(e.nativeEvent.pageX) ? { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY } : undefined,
              )
        }
      />

      <View className="pb-2 pt-6">
        <View className="mb-4 flex-row items-baseline gap-2">
          <Text className="text-[34px] font-semibold leading-[38px] tracking-tighter text-ink">{streakShown}</Text>
          <Text className="text-[14px] text-purple">{streak === 0 ? 'day streak. Start one today' : 'day streak'}</Text>
          <Text className="ml-auto text-[12.5px] text-purple">
            Week {weekNumber(today)}, {weekCount} of 7
          </Text>
        </View>
        <WeekDots />
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

/** A tiny line of how the last two weeks of meaning went, for the plant row. */
function Sparkline() {
  const { entries, today } = useEntries();
  const values = dailySeries(entries, today, 14).values.meaning;
  const points = values.map((v, i) => (v === null ? null : { x: 2 + (i / 13) * 70, y: 28 - (v / 100) * 24 })).filter(Boolean) as {
    x: number;
    y: number;
  }[];
  if (points.length < 2) return null;
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  return (
    <Svg width={74} height={30} viewBox="0 0 74 30" fill="none">
      <Path d={d} stroke={signalColor('meaning')} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * Phones and tablets: one slim row for this week's plant, so the page stays calm. Tap it to open the trend chart
 * underneath.
 */
export function MobileInsights() {
  const { entries, today } = useEntries();
  const { ink } = useColors();
  const [open, setOpen] = useState(false);
  const weekCount = useWeekCount();
  const plant = plantStateForWeek(entries, weekStartKey(today));
  const species = speciesForWeek(weekStartKey(today));

  return (
    <View className="border-y border-line">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="This week's plant and trend"
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center gap-3 py-3.5 hover:opacity-80"
      >
        <View className="w-12">
          <Plant tight state={plant} species={species} />
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-semibold text-ink">
            {weekCount === 0 ? 'Not planted yet' : vitalityLabel(plant.vitality)}
          </Text>
          <Text className="mt-0.5 text-[12.5px] text-purple">
            {weekCount === 0 ? "Write today's entry to plant it." : `This week's plant, ${weekCount} of 7 entries`}
          </Text>
        </View>
        <Sparkline />
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
          <Path
            d={open ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'}
            stroke={ink}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>
      {open && (
        <View className="border-t border-line pb-5 pt-4">
          <TrendPanel />
        </View>
      )}
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
