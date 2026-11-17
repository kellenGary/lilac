import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { MIN_DAYS, listForDay, markKey, statusOf, suggestions, taskEffect, type Suggestion } from '@/lib/tasks';
import { Column, Container, InfoHeading, LoadingScreen, PageHeader, Reveal, Screen, SketchArt, TODO_ART } from '@/shared-components';
import { useEntries } from '@/state/entries';
import { useTasks } from '@/state/tasks';
import { useColors } from '@/state/theme';
import { Section } from '../LookBack/components/Section';
import { AddTaskSheet } from './components/AddTaskSheet';
import { Experiments } from './components/Experiments';
import { Helps, type HelpRow } from './components/Helps';
import { Suggested } from './components/Suggested';
import { TaskRow } from './components/TaskRow';

/** A short list of things to do each day, and what they seem to do for how your days read. */
export function TodoPage() {
  const { status: entriesStatus, entries, today } = useEntries();
  const tasks = useTasks();
  const { purple } = useColors();
  const [adding, setAdding] = useState(false);

  const list = useMemo(() => listForDay(tasks.tasks, today), [tasks.tasks, today]);
  const doneToday = list.filter((t) => tasks.markMap.has(markKey(t.id, today))).length;
  const effects = useMemo(
    () => new Map(tasks.tasks.filter((t) => t.kind === 'daily').map((t) => [t.id, taskEffect(t, tasks.marks, entries, today)])),
    [tasks.tasks, tasks.marks, entries, today],
  );
  const doneTotal = (id: string) => tasks.marks.filter((m) => m.taskId === id).length;
  const helpRows = useMemo<HelpRow[]>(
    () =>
      tasks.tasks
        .flatMap((t) => (effects.get(t.id)?.gap != null ? [{ task: t, effect: effects.get(t.id)! }] : []))
        .sort((a, b) => Math.abs(b.effect.gap ?? 0) - Math.abs(a.effect.gap ?? 0)),
    [tasks.tasks, effects],
  );
  const ideas = useMemo(() => suggestions(entries, tasks.tasks), [entries, tasks.tasks]);
  const running = tasks.tasks.some((t) => t.experiment && statusOf(t.experiment, today) === 'running');

  if (entriesStatus !== 'ready' || tasks.status === 'loading') return <LoadingScreen />;

  const addSuggestion = (s: Suggestion) => tasks.add(s.title, 'daily', s.theme).catch(() => {});

  return (
    <Screen inTabs>
      <Container>
        <PageHeader />
        <Column className="pb-16">
          <SketchArt drawing={TODO_ART} />
          <InfoHeading
            label="About this page"
            note="Small things that might help. Tick them off each day, and over time you'll see how your days read when you do them."
          >
            <Text accessibilityRole="header" className="text-[30px] font-semibold tracking-tight text-ink">
              To do
            </Text>
          </InfoHeading>

          {tasks.status === 'error' && (
            <View className="mt-6 gap-2">
              <Text className="text-base text-roseInk">We couldn&apos;t load your list.</Text>
              <Pressable accessibilityRole="button" onPress={tasks.reload} className="self-start py-1">
                <Text className="text-sm font-semibold text-ink underline">Try again</Text>
              </Pressable>
            </View>
          )}

          <Reveal style={{ marginTop: 24 }}>
            <View className="flex-row items-baseline justify-between">
              <InfoHeading
                label="About your list"
                note="Tick a habit when you've done it. Next to each habit, “lighter +6” means days you do it read 6 points lighter than days you don't. Tap a habit's name to try it as a two-week experiment, or to remove it."
              >
                <Text className="text-[11px] font-semibold uppercase tracking-[1.3px] text-purple">Today</Text>
              </InfoHeading>
              {list.length > 0 && (
                <Text className="text-[13px] font-semibold text-purple">
                  {doneToday} of {list.length} done
                </Text>
              )}
            </View>
            <View className="mt-2">
              {list.length === 0 && (
                <Text className="border-t border-line pt-3.5 text-base leading-6 text-muted">
                  Nothing yet. Add a small habit, like a walk.
                </Text>
              )}
              {list.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  mark={tasks.markMap.get(markKey(task.id, today))}
                  effect={effects.get(task.id) ?? null}
                  doneTotal={doneTotal(task.id)}
                  canStartExperiment={!running && !task.experiment}
                  onToggle={() => tasks.toggle(task.id, today)}
                  onMood={(mood) => tasks.setMood(task.id, today, mood)}
                  onStartExperiment={() => tasks.startExperiment(task.id)}
                  onRemove={() => tasks.remove(task.id)}
                />
              ))}
              <Pressable
                accessibilityRole="button"
                onPress={() => setAdding(true)}
                className="flex-row items-center gap-3 border-t border-line py-3.5 hover:opacity-70"
              >
                <View
                  className="h-[26px] w-[26px] items-center justify-center rounded-full"
                  style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: purple }}
                >
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                    <Path d="M12 5v14M5 12h14" stroke={purple} strokeWidth={3} strokeLinecap="round" />
                  </Svg>
                </View>
                <Text className="text-[15px] font-semibold text-purple">Add something</Text>
              </Pressable>
            </View>
          </Reveal>

          {tasks.tasks.some((t) => t.experiment) && (
            <Section
              title="Experiment"
              tip="You try a habit for two weeks. When it ends, we compare how those days read with the two weeks before. Tap a habit's name above to start one."
            >
              <Experiments
                tasks={tasks.tasks}
                marks={tasks.marks}
                entries={entries}
                today={today}
                onStop={(id) => tasks.stopExperiment(id).catch(() => {})}
                onRestart={(id) => tasks.startExperiment(id).catch(() => {})}
              />
            </Section>
          )}

          <Section
            title="What seems to help"
            tip={`How the days you do a habit read compared with the days you don't. It needs ${MIN_DAYS} of each. These are links in your own days, not causes, and not medical advice. A day can read lighter for many reasons.`}
          >
            <Helps rows={helpRows} />
          </Section>

          {ideas.length > 0 && (
            <Section
              title="Suggested for you"
              tip="Themes you wrote about on days that read lighter. One tap adds one as a daily habit."
            >
              <Suggested items={ideas} onAdd={addSuggestion} />
            </Section>
          )}
        </Column>
      </Container>
      <AddTaskSheet visible={adding} onClose={() => setAdding(false)} onAdd={tasks.add} />
    </Screen>
  );
}
