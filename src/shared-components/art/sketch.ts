import { svgPathProperties } from 'svg-path-properties';

/** Where a shape sits: moved down/across, and optionally turned about a point. */
export type Tf = { dx?: number; dy?: number; rot?: [deg: number, cx: number, cy: number] };

/** One piece of a drawing, as a path. `fill` of 'none' means a line only. */
export type Shape = { d: string; fill: string; tf?: Tf; top?: boolean; fixedInk?: boolean };

export const INK = '#17161A';
export const CREAM = '#FBF8F3';

/** Whether a fill is a color worth hatching (not paper white, not the dark of a pupil, not empty). */
export const isColored = (fill: string) => fill !== 'none' && fill !== CREAM && fill !== INK;

/** Mark a line that sits on a light surface (paper, an eye), so it stays dark when the page is dark. */
export const onLight = (s: Shape): Shape => ({ ...s, fixedInk: true });

export const path = (d: string, fill = 'none', tf?: Tf, top?: boolean): Shape => ({ d, fill, tf, top });

export const circle = (cx: number, cy: number, r: number, fill = 'none', tf?: Tf, top?: boolean): Shape =>
  path(`M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`, fill, tf, top);

export const rect = (x: number, y: number, w: number, h: number, r: number, fill = 'none', tf?: Tf): Shape =>
  path(
    `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}` +
      `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`,
    fill,
    tf,
  );

/** A gentle, smooth push in x and y at a point, so lines wander like they were drawn by hand. */
function wobble(x: number, y: number, seed: number): [number, number] {
  const s = seed * 1.7;
  const dx = 1.1 * Math.sin(y * 0.11 + x * 0.05 + s) + 0.6 * Math.sin(y * 0.23 - x * 0.09 + 1.7 + s);
  const dy = 1.1 * Math.sin(x * 0.1 + y * 0.04 + 0.8 + s) + 0.6 * Math.sin(x * 0.21 + y * 0.1 + 2.3 + s);
  return [dx, dy];
}

function place(x: number, y: number, tf?: Tf): [number, number] {
  let px = x;
  let py = y;
  if (tf?.rot) {
    const [deg, cx, cy] = tf.rot;
    const a = (deg * Math.PI) / 180;
    const ox = px - cx;
    const oy = py - cy;
    px = cx + ox * Math.cos(a) - oy * Math.sin(a);
    py = cy + ox * Math.sin(a) + oy * Math.cos(a);
  }
  return [px + (tf?.dx ?? 0), py + (tf?.dy ?? 0)];
}

const STEP = 2.4;
const r1 = (n: number) => Math.round(n * 10) / 10;

/** The shape redrawn as a wobbly polyline. A different seed gives a differently wobbly copy. */
export function sketchy(shape: Shape, seed: number): string {
  const closed = /z\s*$/i.test(shape.d.trim());
  const parts = shape.d.split(/(?=M)/).filter((p) => p.trim());
  let out = '';
  for (const part of parts) {
    const props = new svgPathProperties(part);
    const length = props.getTotalLength();
    const n = Math.max(2, Math.ceil(length / STEP));
    for (let i = 0; i <= n; i++) {
      const p = props.getPointAtLength((length * i) / n);
      const [x, y] = place(p.x, p.y, shape.tf);
      const [wx, wy] = wobble(x, y, seed);
      out += `${i === 0 ? 'M' : 'L'}${r1(x + wx)} ${r1(y + wy)}`;
    }
    if (closed) out += 'Z';
  }
  return out;
}
