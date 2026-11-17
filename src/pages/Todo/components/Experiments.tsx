import { Pressable, Text, View } from 'react-native';

import { addDays, formatShort } from '@/lib/dates';
import { dayNumber, endOf, experimentResult, statusOf, verdict, type Task, type TaskMark } from '@/lib/tasks';
import type { Entry } from '@/lib/types';
import { useColors } from '@/state/theme';

function Dots({ task, marks, today }: { task: Task; marks: Set<string>; today: string }) {
  const { ink, line, lilac } = useColors();
  const e = task.experiment!;
  return (
    <View className="my-3 flex-row gap-[5px]" accessibilityLabel={`Day ${dayNumber(e, today)} of ${e.days}`}>
      {Array.from({ length: e.days }, (_, i) => {
        const day = addDays(e.start, i);
        const done = marks.has(day);
        const future = day > today;
        return (
          <View
            key={day}
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              borderWidth: 1.5,
              borderColor: future ? line : done ? ink : '#B9B2C2',
              backgroundColor: done ? lilac : 'transparent',
              ...(day === today ? { outlineWidth: 1.5, outlineColor: ink, outlineOffset: 2, outlineStyle: 'solid' } : null),
            }}
          />
        );
      })}
    </View>
  );
}

/** A habit tried for two weeks: progress while it runs, and how those days read once it's over. */
export function Experiments({
  tasks,
  marks,
  entries,
  today,
  onStop,
  onRestart,
}: {
  tasks: Task[];
  marks: TaskMark[];
  entries: Entry[];
  today: string;
  onStop: (id: string) => void;
  onRestart: (id: string) => void;
}) {
  const withExperiment = tasks.filter((t) => t.experiment);
  if (withExperiment.length === 0) return null;

  return (
    <View className="gap-3">
      {withExperiment.map((task) => {
        const e = task.experiment!;
        const running = statusOf(e, today) === 'running';
        const result = experimentResult(task, marks, entries, today)!;
        const done = new Set(marks.filter((m) => m.taskId === task.id).map((m) => m.day));
        return running ? (
          <View key={task.id} className="rounded-[22px] bg-lilac/25 px-5 py-4">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.3px] text-purple">
              Running · day {dayNumber(e, today)} of {e.days}
            </Text>
            <Text className="mt-1 text-lg font-semibold text-ink">{task.title}</Text>
            <Dots task={task} marks={done} today={today} />
            <Text className="text-[13px] leading-[18px] text-purple">
              Done {result.doneDays} of {dayNumber(e, today)} · ends {formatShort(endOf(e))}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => onStop(task.id)} className="mt-2 self-start py-1 hover:opacity-70">
              <Text className="text-[13px] text-muted underline">Stop this experiment</Text>
            </Pressable>
          </View>
        ) : (
          <View key={task.id} className="gap-1.5 rounded-[22px] border border-line bg-surface px-5 py-4">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.3px] text-purple">
              Finished {formatShort(endOf(e))}
            </Text>
            <Text className="text-lg font-semibold text-ink">{task.title}</Text>
            <Text className="text-[15px] leading-[22px] text-body">{verdict(result, task.title)}</Text>
            <View className="mt-1 flex-row gap-5">
              <Pressable accessibilityRole="button" onPress={() => onRestart(task.id)} className="py-1 hover:opacity-70">
                <Text className="text-[13px] font-semibold text-ink underline">Run it again</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => onStop(task.id)} className="py-1 hover:opacity-70">
                <Text className="text-[13px] text-muted underline">Dismiss</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}
