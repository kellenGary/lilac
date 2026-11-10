import type { ReactNode } from 'react';
import { Path } from 'react-native-svg';

import { colors } from '@/theme/colors';
import { useTheme } from '@/state/theme';

/*
 * Pieces shared by every plant species. All coordinates are in the plant's 300x220 viewBox; the stem base sits at
 * (150, 176). Every species is drawn from the same four 0-1 values and reads them the same way:
 *   growth -> size, how many leaves/parts, bloom       tension -> (anxiety) tighter, narrower, spikier, jumpier
 *   droop  -> (depression) hanging, yellowing, bowing  carry   -> (last week) sturdiness (soil and shoot are shared)
 */

/** Outlines and veins are always this dark ink, so a plant looks the same in light and dark mode. */
export const ink = colors.ink;

/** How far dark mode pulls the fills toward the page color: 0 is identical to light mode. A touch takes the glare off. */
const DARK_DIM = 0.18;

export const GROUND = 176;
export const MAX_H = 148;

export type Live = { growth: number; tension: number; droop: number; carry: number };
/** What every species body receives. `lost` is how many lower leaves have dropped (0-3), from depression. */
export type BodyProps = Live & { lost: number };

export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
export const f = (n: number) => n.toFixed(1);
export const rad = (deg: number) => (deg * Math.PI) / 180;

export function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa
    .map((c, i) =>
      Math.round(c + (pb[i] - c) * clamp01(t))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/** Fills keep their colors in dark mode, softened slightly (see DARK_DIM). */
export function useTone(): (hex: string) => string {
  const { isDark, palette } = useTheme();
  return (hex) => (isDark ? mix(hex, palette.cream, DARK_DIM) : hex);
}

/** Healthy color -> yellow -> brown as droop rises. */
export function wilt(base: string, droop: number): string {
  return mix(mix(base, '#D9CC82', droop * 1.6), '#B8976A', (droop - 0.55) * 2);
}

/** Bloom amount: needs a thriving plant, and fades quickly with depression. */
export const bloomOf = (g: number, d: number) => clamp01((g - 0.55) / 0.35) * clamp01(1 - d * 1.4);

export const stemX = (h: number, tension: number, droop: number) => {
  const u = h / MAX_H;
  return 150 + 7 * Math.sin(u * 3.1) + droop * 34 * u * u + tension * 2.6 * Math.sin(u * 31) * u;
};
export const stemY = (h: number) => GROUND - h;

/** A line drawn as an ink outline with a colored core, like the stems. */
export function Tube({ d, w, fill }: { d: string; w: number; fill: string }): ReactNode {
  return (
    <>
      <Path d={d} fill="none" stroke={ink} strokeWidth={w + 2.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={d} fill="none" stroke={fill} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

/** A pointed, lens-shaped leaf as one path, from (x, y) at `deg` (0 = pointing right, clockwise), length l, width w. */
export function lensPath(x: number, y: number, deg: number, l: number, w: number): string {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  const p = (u: number, v: number) => `${f(x + u * c - v * s)} ${f(y + u * s + v * c)}`;
  return `M${p(0, 0)} C${p(0.25 * l, -w)} ${p(0.75 * l, -w)} ${p(l, 0)} C${p(0.75 * l, w)} ${p(0.25 * l, w)} ${p(0, 0)}Z`;
}
