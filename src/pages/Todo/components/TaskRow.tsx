import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { FEELINGS } from '@/lib/feeling';
import type { Task, TaskEffect, TaskMark } from '@/lib/tasks';
import { themeLabel } from '@/lib/themes';
import { Face } from '@/shared-components/Face';
import { useColors } from '@/state/theme';

function meta(task: Task, effect: TaskEffect | null, doneTotal: number): string {
  if (task.kind === 'once') return 'Just today';
  const theme = task.theme ? `${themeLabel(task.theme)} · ` : 'Daily · ';
  if (effect?.gap != null) {
    const size = Math.abs(effect.gap);
    if (size < 3) return `${theme}about the same`;
    return `${theme}${effect.gap > 0 ? 'lighter' : 'heavier'} ${effect.gap > 0 ? '+' : '−'}${size}`;
  }
  return `${theme}${doneTotal}×`;
}

/**
 * One item on today's list. The circle ticks it (and then offers a quick "how did that feel?"). Tapping the words
 * opens the extras: start a two-week experiment on a habit, or remove it.
 */
export function TaskRow({
  task,
  mark,
  effect,
  doneTotal,
  canStartExperiment,
  onToggle,
  onMood,
  onStartExperiment,
  onRemove,
}: {
  task: Task;
  mark: TaskMark | undefined;
  effect: TaskEffect | null;
  doneTotal: number;
  canStartExperiment: boolean;
  onToggle: () => Promise<void>;
  onMood: (mood: number | null) => Promise<void>;
  onStartExperiment: () => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const { ink, lilac } = useColors();
  const done = !!mark;
  const [asking, setAsking] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guard = async (work: () => Promise<void>) => {
    setError(null);
    try {
      await work();
    } catch {
      setError("That didn't save. Check your connection and try again.");
    }
  };

  return (
    <View className="border-t border-line py-3.5">
      <View className="flex-row items-start gap-3">
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={task.title}
          onPress={() =>
            guard(async () => {
              await onToggle();
              setAsking(!done); // just ticked: ask how it felt (just unticked: stop asking)
            })
          }
          hitSlop={8}
          className="mt-px h-[26px] w-[26px] items-center justify-center rounded-full"
          style={{ borderWidth: 1.5, borderColor: ink, backgroundColor: done ? lilac : 'transparent' }}
        >
          {done && (
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
              <Path d="M5 12.5l4.5 4.5L19 7" stroke={ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          )}
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setOpen((v) => !v)} className="flex-1">
          <Text className={`text-base font-medium leading-[22px] ${done ? 'text-muted line-through' : 'text-ink'}`}>
            {task.title}
          </Text>
          <Text className="mt-0.5 text-[12.5px] leading-[17px] text-purple">{meta(task, effect, doneTotal)}</Text>
        </Pressable>
        {mark?.mood ? <Face level={mark.mood} size={22} /> : null}
      </View>

      {asking && done && !mark?.mood && (
        <View className="ml-[38px] mt-2.5 rounded-2xl border border-line bg-surface px-3 py-2.5">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-[12.5px] font-semibold text-purple">How did that feel?</Text>
            <Pressable accessibilityRole="button" onPress={() => setAsking(false)} hitSlop={8}>
              <Text className="text-[12.5px] text-muted">Skip</Text>
            </Pressable>
          </View>
          <View className="flex-row gap-2">
            {FEELINGS.map((f) => (
              <Pressable
                key={f.level}
                accessibilityRole="button"
                accessibilityLabel={f.label}
                onPress={() =>
                  guard(async () => {
                    await onMood(f.level);
                    setAsking(false);
                  })
                }
                className="hover:opacity-70"
              >
                <Face level={f.level} size={32} />
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {open && (
        <View className="ml-[38px] mt-2.5 flex-row flex-wrap gap-x-5 gap-y-1">
          {task.kind === 'daily' && canStartExperiment && (
            <Pressable
              accessibilityRole="button"
              onPress={() => guard(onStartExperiment)}
              className="py-1.5 hover:opacity-70"
            >
              <Text className="text-[13px] font-semibold text-ink underline">Try it as a 2-week experiment</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => (confirm ? guard(onRemove) : setConfirm(true))}
            className="py-1.5 hover:opacity-70"
          >
            <Text className={`text-[13px] underline ${confirm ? 'font-semibold text-roseInk' : 'text-muted'}`}>
              {confirm ? 'Tap again to remove it and its history' : 'Remove'}
            </Text>
          </Pressable>
        </View>
      )}
      {error && (
        <Text accessibilityRole="alert" className="ml-[38px] mt-1.5 text-[12.5px] text-roseInk">
          {error}
        </Text>
      )}
    </View>
  );
}
