import type { ReactNode } from 'react';
import { G, Path } from 'react-native-svg';

import { colors } from '@/theme/colors';
import { clamp01, f, ink, mix, stemX, stemY, Tube, useTone, wilt, type BodyProps } from './shared';

/*
 * Tulip: one tall stem, long strap leaves, and a lilac cup.
 *   growth -> taller stem, more leaves, then the bud opens
 *   tension -> narrow, upright leaves and a kinked stem
 *   droop -> the stem bows, the leaves hang and the head nods; petals brown
 */

const PETAL = '#D4C2F0';
const PETAL_BACK = '#B79BDC';

/** A long strap leaf along a curve, as one outlined path. */
function Strap({ bx, out, L, a, d, fill }: { bx: number; out: 1 | -1; L: number; a: number; d: number; fill: string }) {
  const tone = useTone();
  const tx = out * (16 + 30 * (1 - a * 0.6) + 34 * d);
  const ty = 0.74 - 0.55 * d + 0.12 * a;
  const P = [
    [bx, 176],
    [bx + out * 5, 176 - L * 0.5],
    [bx + out * (8 + 10 * d), 176 - L * 0.88 + 10 * d * L * 0.01],
    [bx + tx, 176 - L * ty],
  ];
  const at = (t: number) => {
    const m = 1 - t;
    const x = m * m * m * P[0][0] + 3 * m * m * t * P[1][0] + 3 * m * t * t * P[2][0] + t * t * t * P[3][0];
    const y = m * m * m * P[0][1] + 3 * m * m * t * P[1][1] + 3 * m * t * t * P[2][1] + t * t * t * P[3][1];
    const dx = 3 * m * m * (P[1][0] - P[0][0]) + 6 * m * t * (P[2][0] - P[1][0]) + 3 * t * t * (P[3][0] - P[2][0]);
    const dy = 3 * m * m * (P[1][1] - P[0][1]) + 6 * m * t * (P[2][1] - P[1][1]) + 3 * t * t * (P[3][1] - P[2][1]);
    const n = Math.hypot(dx, dy) || 1;
    return { x, y, nx: -dy / n, ny: dx / n };
  };
  const hw = 8.5 * (1 - a * 0.42);
  const N = 16;
  const left: string[] = [];
  const right: string[] = [];
  const mid: string[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = at(t);
    const w = hw * Math.sin(Math.PI * Math.pow(t, 0.75)) * (1 - 0.15 * t);
    left.push(`${f(p.x + p.nx * w)} ${f(p.y + p.ny * w)}`);
    right.push(`${f(p.x - p.nx * w)} ${f(p.y - p.ny * w)}`);
    mid.push(`${f(p.x)} ${f(p.y)}`);
  }
  const outline = `M${left.join(' L')} L${right.reverse().join(' L')}Z`;
  const rib = `M${mid.slice(1, N).join(' L')}`;
  return (
    <G>
      <Path d={outline} fill={tone(fill)} stroke={ink} strokeWidth={1.1} strokeLinejoin="round" />
      <Path d={rib} fill="none" stroke={ink} strokeWidth={0.7} opacity={0.5} strokeLinecap="round" />
    </G>
  );
}

function Cup({ s, d }: { s: number; d: number }) {
  const tone = useTone();
  const front = mix(PETAL, '#B8976A', d * 1.1);
  const back = mix(PETAL_BACK, '#9A7C55', d * 1.1);
  return (
    <G transform={`scale(${f(s)})`}>
      <Path d="M0 4 C-15 0 -17 -20 -11 -33 C-5 -25 -2 -12 0 4Z" fill={tone(back)} stroke={ink} strokeWidth={1.1} strokeLinejoin="round" />
      <Path d="M0 4 C15 0 17 -20 11 -33 C5 -25 2 -12 0 4Z" fill={tone(back)} stroke={ink} strokeWidth={1.1} strokeLinejoin="round" />
      <Path
        d="M-9 3 C-15 -12 -8 -30 0 -39 C8 -30 15 -12 9 3 C4 7 -4 7 -9 3Z"
        fill={tone(front)}
        stroke={ink}
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
      <Path d="M0 -37 C-1.5 -22 -1.5 -8 0 5" fill="none" stroke={ink} strokeWidth={0.6} opacity={0.5} />
      <Path d="M-9 3 C-6 -8 -4 -22 0 -37 C-6 -22 -9 -10 -9 3Z" fill={ink} opacity={0.07} />
    </G>
  );
}

function Bud({ s, d }: { s: number; d: number }) {
  const tone = useTone();
  return (
    <G transform={`scale(${f(s)})`}>
      <Path
        d="M0 3 C-9 -1 -9 -17 0 -25 C9 -17 9 -1 0 3Z"
        fill={tone(mix(mix(PETAL, colors.leafMid, 0.4), '#B8976A', d))}
        stroke={ink}
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
      <Path d="M0 1 C-2 -8 -2 -17 0 -23" fill="none" stroke={ink} strokeWidth={0.6} opacity={0.5} />
    </G>
  );
}

export function TulipBody({ growth: g, tension: a, droop: d, carry: c, lost }: BodyProps) {
  const tone = useTone();
  // The cup adds about 60 on top, and the whole plant has to fit its frame.
  const H = 46 + 60 * g;
  const stemColor = mix('#98B27A', '#C9B88A', d);
  const stemW = 2.8 + 2 * c;
  const px = (h: number) => stemX(h, a, d);
  const pts: string[] = [];
  for (let h = 0; h < H; h += 4) pts.push(`${f(px(h))} ${f(stemY(h))}`);
  pts.push(`${f(px(H))} ${f(stemY(H))}`);
  const stem = `M${pts.join(' L')}`;

  const count = Math.max(2, 2 + (g > 0.35 ? 1 : 0) + (g > 0.7 ? 1 : 0) - Math.min(lost, 2));
  const straps: ReactNode[] = [];
  const order: { out: 1 | -1; k: number; bx: number }[] = [
    { out: -1, k: 1, bx: 146 },
    { out: 1, k: 0.88, bx: 154 },
    { out: -1, k: 0.7, bx: 149 },
    { out: 1, k: 0.6, bx: 151 },
  ];
  order.slice(0, count).forEach(({ out, k, bx }, i) => {
    const L = (66 + 58 * g) * k;
    straps.push(<Strap key={i} bx={bx} out={out} L={L} a={a} d={d} fill={wilt(i % 2 ? colors.leafLight : colors.leafMid, d)} />);
  });

  const b = clamp01((g - 0.4) / 0.4) * clamp01(1 - d * 1.2);
  const topX = px(H);
  const topY = stemY(H);
  const nod = d * 58; // the head hangs toward the way the stem bows
  const head =
    g < 0.12 ? null : (
      <G transform={`translate(${f(topX)} ${f(topY + 2)}) rotate(${f(nod)})`}>
        {b > 0.5 ? <Cup s={0.8 + 0.7 * ((b - 0.5) / 0.5)} d={d} /> : <Bud s={0.7 + 0.5 * b} d={d} />}
      </G>
    );

  return (
    <G>
      {straps}
      <Tube d={stem} w={stemW} fill={tone(stemColor)} />
      {head}
    </G>
  );
}
