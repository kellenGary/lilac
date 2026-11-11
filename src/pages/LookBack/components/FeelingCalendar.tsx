import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { fromKey } from '@/lib/dates';
import { feelingLabel } from '@/lib/feeling';
import { monthGrid, monthSummary } from '@/lib/lookback';
import { feelingOf, orbColor } from '@/lib/orbs';
import type { Entry } from '@/lib/types';
import { useColors, useTheme } from '@/state/theme';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** One month, each written day a square in the color of how it felt. Tap a day to open it. */
export function FeelingCalendar({ entries, today }: { entries: Entry[]; today: string }) {
  const router = useRouter();
  const { ink, cream } = useColors();
  const { isDark } = useTheme();
  const now = fromKey(today);
  const oldest = entries.length ? fromKey(entries[entries.length - 1].date) : now;
  // Months back from this one, so 0 is this month. The limit is the month of the first entry.
  const maxBack = (now.getFullYear() - oldest.getFullYear()) * 12 + now.getMonth() - oldest.getMonth();
  const [back, setBack] = useState(0);
  const shown = new Date(now.getFullYear(), now.getMonth() - Math.min(back, maxBack), 1);
  const year = shown.getFullYear();
  const month = shown.getMonth();

  const weeks = monthGrid(entries, year, month, today);
  const summary = monthSummary(entries, year, month);
  const numberColor = isDark ? cream : ink;

  const arrow = (dir: 'prev' | 'next') => {
    const disabled = dir === 'prev' ? back >= maxBack : back <= 0;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={dir === 'prev' ? 'Previous month' : 'Next month'}
        disabled={disabled}
        onPress={() => setBack((b) => b + (dir === 'prev' ? 1 : -1))}
        className={`h-11 w-11 items-center justify-center ${disabled ? 'opacity-25' : ''}`}
      >
        <Text className="text-2xl text-ink">{dir === 'prev' ? '‹' : '›'}</Text>
      </Pressable>
    );
  };

  return (
    <View className="rounded-3xl bg-surface p-4 pb-5">
      <View className="flex-row items-center justify-between">
        {arrow('prev')}
        <Text accessibilityRole="header" className="text-base font-semibold text-ink">
          {shown.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
        {arrow('next')}
      </View>

      <View className="mt-1 flex-row">
        {DAYS.map((d, i) => (
          <Text key={i} className="flex-1 text-center text-[11px] uppercase tracking-widest text-muted">
            {d}
          </Text>
        ))}
      </View>

      <View className="mt-1.5 gap-1">
        {weeks.map((week, wi) => (
          <View key={wi} className="flex-row gap-1">
            {week.map((day) => {
              const dayNumber = Number(day.key.slice(8));
              if (!day.inMonth) return <View key={day.key} style={{ flex: 1, aspectRatio: 1 }} />;
              const level = day.entry ? feelingOf(day.entry) : null;
              return (
                <Pressable
                  key={day.key}
                  accessibilityRole={day.entry ? 'link' : undefined}
                  accessibilityLabel={`${day.key}${level ? `, ${feelingLabel(level)}` : ', no entry'}`}
                  disabled={!day.entry}
                  onPress={() => router.push({ pathname: '/entry/[date]', params: { date: day.key } })}
                  className={`items-center justify-center rounded-lg ${
                    day.entry ? '' : day.future ? 'border border-line' : 'bg-track'
                  } ${day.isToday ? 'border-2 border-ink' : ''}`}
                  style={[{ flex: 1, aspectRatio: 1 }, level ? { backgroundColor: orbColor(level) } : null]}
                >
                  <Text
                    className={`text-[12px] font-medium ${level ? '' : 'text-muted'}`}
                    style={level ? { color: numberColor, opacity: 0.85 } : { opacity: day.future ? 0.5 : 0.8 }}
                  >
                    {dayNumber}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <Text className="mt-4 text-center text-sm text-muted">
        {summary.days === 0
          ? 'No entries this month'
          : `${summary.days} ${summary.days === 1 ? 'day' : 'days'} written, mostly ${feelingLabel(summary.typical!).toLowerCase()}`}
      </Text>
    </View>
  );
}
