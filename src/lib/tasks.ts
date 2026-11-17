import { addDays, fromKey } from './dates';
import { lightness, themeHelps } from './helps';
import type { Entry } from './types';

/*
 * The to-do list. A "daily" habit repeats every day; a "once" item belongs to one day. Each tick is saved with its date,
 * so how the days you did something read can be set beside the days you didn't. Links in your own days, never causes.
 */

export type Task = {
  id: string;
  title: string;
  kind: 'daily' | 'once';
  theme: string | null;
  createdOn: string;
  /** The one day a "once" item belongs to. */
  onDate: string | null;
  experiment: { start: string; days: number } | null;
};
export type TaskMark = { taskId: string; day: string; mood: number | null };

/** Days needed on each side before a habit's effect is shown at all. */
export const MIN_DAYS = 4;
export const EXPERIMENT_DAYS = 14;
/** How far back habit effects look. */
const LOOKBACK_DAYS = 120;

export const markKey = (taskId: string, day: string) => `${taskId}|${day}`;
export const indexMarks = (marks: TaskMark[]) => new Map(marks.map((m) => [markKey(m.taskId, m.day), m]));

/** What belongs on a day's list: every habit that existed by then, plus that day's one-offs. */
export function listForDay(tasks: Task[], day: string): Task[] {
  return tasks.filter((t) => (t.kind === 'daily' ? t.createdOn <= day : t.onDate === day));
}

export type TaskEffect = {
  /** How much lighter (+) or heavier (-) days read when it was done, or null if there isn't enough to say. */
  gap: number | null;
  /** Written days it was done on, and written days it wasn't, within the look-back. */
  doneDays: number;
  otherDays: number;
};

/** Compares how written days read when a habit was done against the days it wasn't. Crisis-flagged days are left out. */
export function taskEffect(task: Task, marks: TaskMark[], entries: Entry[], today: string): TaskEffect {
  const done = new Set(marks.filter((m) => m.taskId === task.id).map((m) => m.day));
  const start = [task.createdOn, addDays(today, -LOOKBACK_DAYS)].sort().pop()!;
  const withIt: number[] = [];
  const without: number[] = [];
  for (const e of entries) {
    if (e.crisis || e.date < start || e.date > today) continue;
    (done.has(e.date) ? withIt : without).push(lightness(e));
  }
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const enough = withIt.length >= MIN_DAYS && without.length >= MIN_DAYS;
  return { gap: enough ? Math.round(avg(withIt) - avg(without)) : null, doneDays: withIt.length, otherDays: without.length };
}

// ---------------------------------------------------------------------------------------------------------------
// Experiments: a habit tried for two weeks, then compared with the two weeks before.

export type Experiment = NonNullable<Task['experiment']>;
export const endOf = (e: Experiment) => addDays(e.start, e.days - 1);

export type ExperimentStatus = 'running' | 'finished';
export const statusOf = (e: Experiment, today: string): ExperimentStatus => (today <= endOf(e) ? 'running' : 'finished');

/** Which day of the experiment `today` is (1-based), clamped to its length. */
export function dayNumber(e: Experiment, today: string): number {
  const n = Math.round((fromKey(today).getTime() - fromKey(e.start).getTime()) / 86_400_000) + 1;
  return Math.max(1, Math.min(e.days, n));
}

export type ExperimentResult = {
  /** Ticked days inside the experiment so far. */
  doneDays: number;
  /** Written days inside the experiment so far, and in the same stretch before it. */
  writtenDays: number;
  beforeWritten: number;
  /** How much lighter (+) or heavier (-) the experiment's days read than the days before; null until it ends with enough to say. */
  gap: number | null;
};

export function experimentResult(task: Task, marks: TaskMark[], entries: Entry[], today: string): ExperimentResult | null {
  const e = task.experiment;
  if (!e) return null;
  const end = endOf(e);
  const doneDays = marks.filter((m) => m.taskId === task.id && m.day >= e.start && m.day <= end && m.day <= today).length;
  const inside = entries.filter((x) => x.date >= e.start && x.date <= end && x.date <= today && !x.crisis);
  const beforeStart = addDays(e.start, -e.days);
  const before = entries.filter((x) => x.date >= beforeStart && x.date < e.start && !x.crisis);
  const avg = (list: Entry[]) => list.reduce((s, x) => s + lightness(x), 0) / list.length;
  const finished = today > end;
  const gap = finished && inside.length >= MIN_DAYS && before.length >= MIN_DAYS ? Math.round(avg(inside) - avg(before)) : null;
  return { doneDays, writtenDays: inside.length, beforeWritten: before.length, gap };
}

/** Wording for an experiment's verdict: honest about too little data, and always "a link, not proof". */
export function verdict(r: ExperimentResult, title: string): string {
  if (r.gap === null) {
    return `Not enough writing to compare yet. It needs at least ${MIN_DAYS} written days in the two weeks and in the two weeks before.`;
  }
  const t = title.toLowerCase();
  const size = Math.abs(r.gap);
  if (size < 4) return `Your days read about the same as before. You did "${t}" on ${r.doneDays} of them.`;
  const how = size >= 10 ? 'noticeably' : 'a little';
  return `Your days read ${how} ${r.gap > 0 ? 'lighter' : 'heavier'} than the two weeks before, and you did "${t}" on ${r.doneDays} of them. That is a link in your own days, not proof of a cause.`;
}

// ---------------------------------------------------------------------------------------------------------------
// Suggestions

const SUGGESTED_TITLE: Record<string, string> = {
  outdoors: 'Spend time outside',
  friends: 'Call or text a friend',
  family: 'Time with family',
  creative: 'Make something',
  sleep: 'Wind down early',
  health: 'Look after your body',
  relationship: 'Time with your partner',
};

export type Suggestion = { theme: string; title: string; days: number };

/** Themes that came up on lighter days in your writing, as habits you could add, minus ones you already have. */
export function suggestions(entries: Entry[], tasks: Task[]): Suggestion[] {
  return themeHelps(entries)
    .filter((h) => h.direction === 'lifts' && SUGGESTED_TITLE[h.key] && !tasks.some((t) => t.theme === h.key))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3)
    .map((h) => ({ theme: h.key, title: SUGGESTED_TITLE[h.key], days: h.days }));
}

export const SUGGESTABLE_THEMES = Object.keys(SUGGESTED_TITLE);
