import { Text, View } from 'react-native';

import type { Task, TaskEffect } from '@/lib/tasks';
import { useColors } from '@/state/theme';

export type HelpRow = { task: Task; effect: TaskEffect };

const RANGE = 25; // a gap this big fills the bar

/** For each habit, how the days you did it read compared with the days you didn't, and how many days that rests on. */
export function Helps({ rows }: { rows: HelpRow[] }) {
  const { ink, line, lilac } = useColors();
  if (rows.length === 0) {
    return (
      <Text className="max-w-[56ch] text-base leading-6 text-muted">
        Not enough days yet. Keep ticking and check back.
      </Text>
    );
  }
  return (
    <View>
      {rows.map(({ task, effect }) => {
        const gap = effect.gap ?? 0;
        const pct = Math.min(1, Math.abs(gap) / RANGE) * 50;
        const early = effect.doneDays < 8;
        return (
          <View key={task.id} className="flex-row items-center gap-3 border-t border-line py-3">
            <View className="flex-1">
              <Text className="text-[15px] font-medium text-ink">{task.title}</Text>
              <Text className="mt-0.5 text-[12px] text-purple">
                {effect.doneDays} {effect.doneDays === 1 ? 'day' : 'days'}{early ? ' · early' : ''}
              </Text>
            </View>
            <View style={{ width: 84, height: 6, borderRadius: 3, backgroundColor: line, justifyContent: 'center' }}>
              <View style={{ position: 'absolute', left: '50%', top: -3, width: 1.5, height: 12, backgroundColor: ink }} />
              <View
                style={{
                  position: 'absolute',
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: lilac,
                  width: `${pct}%`,
                  left: gap >= 0 ? '50%' : `${50 - pct}%`,
                }}
              />
            </View>
            <Text className="w-9 text-right text-[13px] font-semibold text-ink">
              {gap > 0 ? '+' : gap < 0 ? '−' : ''}
              {Math.abs(gap)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
