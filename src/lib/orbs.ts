import { addDays } from './dates';
import { readAsFeeling } from './feeling';
import { THEMES } from './themes';
import type { Entry } from './types';

/** Trailing window the orbs summarise, in days. */
export const WINDOW_DAYS = 30;

/** How a day felt: the face they picked, or how their words read when they skipped the check-in. */
export const feelingOf = (e: Entry): number => e.feeling ?? readAsFeeling(e.scores);

// Rough (1) to great (5). Saturated enough to glow on both the cream and the dark page.
const ORB_COLORS = ['#E8694A', '#F09A3E', '#F0C93E', '#93C65A', '#4FAE6A'];

const lerp = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((k) => parseInt(a.slice(k, k + 2), 16));
  const pb = [1, 3, 5].map((k) => parseInt(b.slice(k, k + 2), 16));
  return `#${pa
    .map((c, k) =>
      Math.round(c + (pb[k] - c) * t)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
};

/** Color for an average feeling between 1 and 5. */
export function orbColor(level: number): string {
  const x = Math.max(1, Math.min(5, level)) - 1;
  const i = Math.min(3, Math.floor(x));
  return lerp(ORB_COLORS[i], ORB_COLORS[i + 1], x - i);
}

export type Orb = {
  theme: string;
  /** Centre and radius in the canvas, from the whole history so orbs stay put while you scrub. */
  x: number;
  y: number;
  r: number;
};

export type OrbState = Orb & {
  /** Entries in the current window that mention this theme, newest first. */
  entries: Entry[];
  /** Average feeling over those entries, or null if none. */
  feeling: number | null;
  /** Drawn radius for the window (shrinks as the theme fades from view). */
  radius: number;
};

/**
 * Places one orb per theme that appears anywhere in the history. Size follows how often the theme comes up, and
 * themes that often share an entry are pulled together until they overlap. Deterministic, so a screen opens the same
 * way every time. Positions are in a width x height box.
 */
export function layoutOrbs(entries: Entry[], width: number, height: number): Orb[] {
  const themes = THEMES.map((t) => t.key as string).filter((k) => entries.some((e) => e.themes.includes(k)));
  const n = themes.length;
  if (n === 0 || width <= 0 || height <= 0) return [];

  const count = themes.map((k) => entries.filter((e) => e.themes.includes(k)).length);
  const maxCount = Math.max(...count);
  const r0 = count.map((c) => 36 + 30 * Math.sqrt(c / maxCount));

  // Co-occurrence, 0 (never together) to 1 (always together), relative to the rarer theme.
  const together = (i: number, j: number) => {
    const both = entries.filter((e) => e.themes.includes(themes[i]) && e.themes.includes(themes[j])).length;
    return both / Math.min(count[i], count[j]);
  };

  const pos = themes.map((_, i) => ({ x: Math.cos(i * 2.4) * (50 + i * 22), y: Math.sin(i * 2.4) * (50 + i * 22) }));
  for (let step = 0; step < 220; step++) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const dist = Math.hypot(dx, dy) || 0.01;
        // Never closer than touching, so labels stay readable; themes that always share entries sit side by side.
        const target = (r0[i] + r0[j]) * (1.8 - 0.8 * together(i, j));
        const push = ((dist - target) / dist) * 0.08;
        pos[i].x += dx * push;
        pos[i].y += dy * push;
        pos[j].x -= dx * push;
        pos[j].y -= dy * push;
      }
    }
    // A gentle pull to the middle keeps unrelated orbs from drifting off.
    for (const p of pos) {
      p.x *= 0.995;
      p.y *= 0.995;
    }
  }

  // Fit the cluster into the box, with room for each orb's glow.
  const pad = 12;
  const minX = Math.min(...pos.map((p, i) => p.x - r0[i]));
  const maxX = Math.max(...pos.map((p, i) => p.x + r0[i]));
  const minY = Math.min(...pos.map((p, i) => p.y - r0[i]));
  const maxY = Math.max(...pos.map((p, i) => p.y + r0[i]));
  const scale = Math.max(
    0.5,
    Math.min(1.5, (width - 2 * pad) / (maxX - minX || 1), (height - 2 * pad) / (maxY - minY || 1)),
  );
  const offX = (width - (maxX - minX) * scale) / 2 - minX * scale;
  const offY = (height - (maxY - minY) * scale) / 2 - minY * scale;
  return themes.map((theme, i) => ({
    theme,
    x: pos[i].x * scale + offX,
    y: pos[i].y * scale + offY,
    r: r0[i] * scale,
  }));
}

/** Entries from the `WINDOW_DAYS` ending on `end`, newest first (input is already newest first). */
export const entriesInWindow = (entries: Entry[], end: string) => {
  const start = addDays(end, -(WINDOW_DAYS - 1));
  return entries.filter((e) => e.date >= start && e.date <= end);
};

/** What each orb looks like for the entries in view. */
export function orbStates(orbs: Orb[], inWindow: Entry[]): OrbState[] {
  const per = orbs.map((o) => inWindow.filter((e) => e.themes.includes(o.theme)));
  const maxInView = Math.max(1, ...per.map((p) => p.length));
  return orbs.map((o, i) => {
    const list = per[i];
    const feeling = list.length ? list.reduce((s, e) => s + feelingOf(e), 0) / list.length : null;
    const radius = o.r * (list.length === 0 ? 0.4 : 0.55 + 0.45 * Math.sqrt(list.length / maxInView));
    return { ...o, entries: list, feeling, radius };
  });
}
