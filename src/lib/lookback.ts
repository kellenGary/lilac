import { addDays, fromKey, toKey, weekStartKey } from './dates';
import { feelingOf } from './orbs';
import { wellbeing } from './plant';
import type { Entry } from './types';

/*
 * Everything the Look back tab shows, computed from entries already on the phone (no extra server or AI calls).
 * Entries the crisis check flagged are never resurfaced here (recaps, "on this day", bright spots): they stay one tap
 * away in the Journal, but the app doesn't bring them back up unprompted.
 */

const shown = (e: Entry) => !e.crisis;

/** `key` moved by whole months, clamping the day (31 Mar minus a month is 28 or 29 Feb). */
export function shiftMonths(key: string, months: number): string {
  const d = fromKey(key);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toKey(d);
}

/** How a day compares to others: the face they chose, then how their words read, so ties still sort sensibly. */
const mood = (e: Entry) => feelingOf(e) * 1000 + wellbeing(e.scores);

// ---------------------------------------------------------------------------------------------------------------
// This week

export type WeekRecap = {
  /** Monday of the week. */
  start: string;
  daysWritten: number;
  /** Days of the week that have happened, today included (1 to 7). */
  daysSoFar: number;
  topThemes: { theme: string; days: number }[];
  /** The lightest and the heaviest day, when there are enough days to compare. */
  brightest: Entry | null;
  heaviest: Entry | null;
  /** One sentence from the week about something that mattered. */
  phrase: { text: string; date: string } | null;
};

/** The week so far (Monday to today), or null if nothing has been written yet. */
export function weekRecap(entries: Entry[], today: string): WeekRecap | null {
  const start = weekStartKey(today);
  const week = entries.filter((e) => e.date >= start && e.date <= today);
  if (week.length === 0) return null;

  const counts = new Map<string, number>();
  for (const e of week) for (const t of e.themes) counts.set(t, (counts.get(t) ?? 0) + 1);
  const topThemes = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([theme, days]) => ({ theme, days }));

  const candidates = week.filter(shown);
  const ranked = [...candidates].sort((a, b) => mood(b) - mood(a));
  const enough = candidates.length >= 3;
  // With a single day there is nothing to compare, so no "lightest day".
  const brightest = ranked.length >= 2 ? ranked[0] : null;
  const heaviest = enough ? ranked[ranked.length - 1] : null;

  const spot = brightSpots(week, 1)[0] ?? null;

  const daysSoFar = Math.round((fromKey(today).getTime() - fromKey(start).getTime()) / 86_400_000) + 1;
  return {
    start,
    daysWritten: week.length,
    daysSoFar,
    topThemes,
    brightest,
    heaviest: heaviest && brightest && heaviest.date !== brightest.date ? heaviest : null,
    phrase: spot ? { text: spot.text, date: spot.date } : null,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Calendar

export type CalendarDay = {
  key: string;
  inMonth: boolean;
  entry: Entry | undefined;
  isToday: boolean;
  future: boolean;
};

/** A month as Monday-first weeks. Days outside the month are included (inMonth false) to square off the grid. */
export function monthGrid(entries: Entry[], year: number, month: number, today: string): CalendarDay[][] {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const first = toKey(new Date(year, month, 1));
  const last = toKey(new Date(year, month + 1, 0));
  const weeks: CalendarDay[][] = [];
  for (let start = weekStartKey(first); start <= last; start = addDays(start, 7)) {
    weeks.push(
      Array.from({ length: 7 }, (_, i) => {
        const key = addDays(start, i);
        return {
          key,
          inMonth: key >= first && key <= last,
          entry: byDate.get(key),
          isToday: key === today,
          future: key > today,
        };
      }),
    );
  }
  return weeks;
}

/** Days written and the typical feeling for a month, for the line under the calendar. */
export function monthSummary(entries: Entry[], year: number, month: number) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  const list = entries.filter((e) => e.date.startsWith(prefix));
  if (list.length === 0) return { days: 0, typical: null as number | null };
  const avg = list.reduce((sum, e) => sum + feelingOf(e), 0) / list.length;
  return { days: list.length, typical: Math.max(1, Math.min(5, Math.round(avg))) };
}

// ---------------------------------------------------------------------------------------------------------------
// On this day

export type Memory = { label: string; entry: Entry };

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'} ago`;

/** Entries from a week, a few months and years ago. Only the ones that exist. */
export function onThisDay(entries: Entry[], today: string): Memory[] {
  const byDate = new Map(entries.filter(shown).map((e) => [e.date, e]));
  const points: { label: string; key: string }[] = [
    { label: plural(1, 'week'), key: addDays(today, -7) },
    { label: plural(1, 'month'), key: shiftMonths(today, -1) },
    { label: plural(3, 'month'), key: shiftMonths(today, -3) },
    { label: plural(6, 'month'), key: shiftMonths(today, -6) },
    ...[1, 2, 3, 4, 5].map((n) => ({ label: plural(n, 'year'), key: shiftMonths(today, -12 * n) })),
  ];
  const seen = new Set<string>();
  const out: Memory[] = [];
  for (const p of points) {
    const entry = byDate.get(p.key);
    if (entry && !seen.has(entry.date)) {
      seen.add(entry.date);
      out.push({ label: p.label, entry });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Bright spots

export type BrightSpot = { date: string; text: string };

/**
 * Sentences the app marked as expressing purpose, gratitude or connection, newest first, at most one per entry.
 * (Highlights under "meaning" are exactly those sentences, so this never surfaces a low-mood line.)
 */
export function brightSpots(entries: Entry[], limit = 5): BrightSpot[] {
  const out: BrightSpot[] = [];
  const seen = new Set<string>(); // the same sentence written on several days is shown once
  for (const e of [...entries].sort((a, b) => (a.date < b.date ? 1 : -1))) {
    if (out.length >= limit) break;
    if (!shown(e)) continue;
    const spot = e.highlights.find((h) => h.signal === 'meaning');
    if (spot && !seen.has(spot.text)) {
      seen.add(spot.text);
      out.push({ date: e.date, text: spot.text });
    }
  }
  return out;
}
