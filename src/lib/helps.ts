import { feelingOf } from './orbs';
import { wellbeing } from './plant';
import { THEMES, themeLabel } from './themes';
import type { Entry } from './types';

/*
 * Themes in your writing that line up with lighter or heavier days. These are links in the person's
 * own writing, not causes, and not medical findings. Every result carries the number of days it rests on.
 */

/** A day's overall lightness, 0-100: how the words scored and how the person said they felt, equally weighted. */
export const lightness = (e: Entry): number => (wellbeing(e.scores) + (feelingOf(e) - 1) * 25) / 2;

const avg = (list: Entry[]) => list.reduce((sum, e) => sum + lightness(e), 0) / list.length;

/** Days needed with and without a theme before it is compared at all. */
export const MIN_DAYS = 4;
/** A gap smaller than this (on the 0-100 scale) is treated as nothing. */
const MIN_GAP = 5;

export type Help = {
  kind: 'theme';
  /** The theme key. */
  key: string;
  label: string;
  /** Days the finding rests on (days with the theme, or on that weekday). */
  days: number;
  /** How much lighter (+) or heavier (-) those days read than the others, rounded. */
  gap: number;
  direction: 'lifts' | 'weighs';
};

/** Entries that haven't been tagged for themes can't be compared; crisis-flagged days are left out entirely. */
const usable = (entries: Entry[]) => entries.filter((e) => !e.crisis);

export function themeHelps(all: Entry[]): Help[] {
  const entries = usable(all);
  const out: Help[] = [];
  for (const { key } of THEMES) {
    const withIt = entries.filter((e) => e.themes.includes(key));
    const without = entries.filter((e) => !e.themes.includes(key));
    if (withIt.length < MIN_DAYS || without.length < MIN_DAYS) continue;
    const gap = Math.round(avg(withIt) - avg(without));
    if (Math.abs(gap) < MIN_GAP) continue;
    out.push({ kind: 'theme', key, label: themeLabel(key), days: withIt.length, gap, direction: gap > 0 ? 'lifts' : 'weighs' });
  }
  return out;
}
