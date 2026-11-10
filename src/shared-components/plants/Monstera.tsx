import type { ReactNode } from 'react';
import { G, Path } from 'react-native-svg';

import { colors } from '@/theme/colors';
import { bloomOf, clamp01, f, ink, mix, Tube, useTone, wilt, type BodyProps } from './shared';

/*
 * Monstera: big heart-shaped leaves on long stalks, cut into lobes; in bloom, a cream spathe.
 *   growth -> more and larger leaves, deeper cuts, then a flower
 *   tension -> smaller, narrower leaves held stiffly upright
 *   droop -> stalks bow, leaves hang and yellow at the edges; leaves drop
 */

const STEPS = 26;
const NOTCHES = [0.34, 0.52, 0.7];

/** Leaf outline in local coordinates: attached at the origin, tip at (L, 0), lobed by `cut` (0-1). */
function outline(L: number, wide: number, cut: number) {
  const x = (s: number) => L * s - 0.16 * L * Math.sin(Math.PI * Math.min(1, s / 0.3));
  const w = (s: number) => {
    let notch = 0;
    for (const n of NOTCHES) notch += Math.exp(-Math.pow((s - n) / 0.032, 2));
    return wide * L * Math.sin(Math.PI * Math.pow(s, 0.72)) * (1 - 0.6 * cut * Math.min(1, notch));
  };
  const upper: string[] = [];
  const lower: string[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const s = i / STEPS;
    upper.push(`${f(x(s))} ${f(-w(s))}`);
    lower.push(`${f(x(s))} ${f(w(s))}`);
  }
  const veins = NOTCHES.map((n) => {
    const sx = x(n);
    return `M${f(L * (n - 0.12))} 0 L${f(sx)} ${f(-w(n) * 0.78)}M${f(L * (n - 0.12))} 0 L${f(sx)} ${f(w(n) * 0.78)}`;
  }).join('');
  return { shape: `M0 0 L${upper.join(' L')} L${lower.reverse().join(' L')}Z`, veins };
}

function Blade({ x, y, deg, L, fill, a, d, cut }: { x: number; y: number; deg: number; L: number; fill: string; a: number; d: number; cut: number }) {
  const tone = useTone();
  const { shape, veins } = outline(L, 0.5 * (1 - a * 0.3), cut);
  const rim = clamp01((d - 0.3) * 1.4);
  return (
    <G transform={`translate(${f(x)} ${f(y)}) rotate(${f(deg)})`}>
      <Path d={shape} fill={tone(fill)} stroke={ink} strokeWidth={1.2} strokeLinejoin="round" />
      <Path d={`M0 0 L${f(L * 0.96)} 0${veins}`} fill="none" stroke={ink} strokeWidth={0.7} opacity={0.55} strokeLinecap="round" />
      {rim > 0.02 && <Path d={shape} fill="none" stroke="#8B6B45" strokeWidth={2.4} opacity={rim * 0.55} strokeLinejoin="round" />}
    </G>
  );
}

export function MonsteraBody({ growth: g, tension: a, droop: d, carry: c, lost }: BodyProps) {
  const tone = useTone();
  const count = Math.max(2, 2 + Math.round(g * 4) - Math.min(lost, 2));
  const stemColor = tone(mix('#98B27A', '#C9B88A', d));
  const cut = clamp01((g - 0.2) / 0.45);
  const leaves: ReactNode[] = [];

  const order = Array.from({ length: count }, (_, i) => i).sort(
    (p, q) => Math.abs(q / (count - 1) - 0.5) - Math.abs(p / (count - 1) - 0.5),
  );
  order.forEach((i, di) => {
    const u = (i / (count - 1)) * 2 - 1;
    const side = u < 0 ? -1 : u > 0 ? 1 : i % 2 ? 1 : -1;
    const lean = Math.abs(u) * (58 - a * 16) + (u === 0 ? 4 : 0); // stalk heading, degrees from vertical
    const Lp = (34 + 62 * g) * (1 - 0.22 * Math.abs(u));
    const ax = 150 + side * Math.sin((lean * Math.PI) / 180) * Lp + side * d * 6;
    const ay = 175 - Math.cos((lean * Math.PI) / 180) * Lp + d * 22 * (Lp / 90);
    const cx = 150 + side * Math.sin((lean * Math.PI) / 180) * Lp * 0.15 + side * d * 10;
    const cy = 175 - Lp * 0.72;
    const stalk = `M150 175 Q${f(cx)} ${f(cy)} ${f(ax)} ${f(ay)}`;
    const heading = Math.min(150, lean * 0.7 + 30 + d * 72 - a * 12); // blade angle from vertical
    const L = (30 + 24 * g) * (1 - 0.3 * Math.abs(u)) * (1 - 0.16 * a) * (1 - 0.1 * d);
    leaves.push(
      <G key={i}>
        <Tube d={stalk} w={1.8 + 1.4 * c} fill={stemColor} />
        <Blade
          x={ax}
          y={ay}
          deg={-90 + side * heading}
          L={L}
          fill={wilt(di % 2 ? colors.leafLight : colors.leafMid, d)}
          a={a}
          d={d}
          cut={cut}
        />
      </G>,
    );
  });

  const b = bloomOf(g, d);
  let flower: ReactNode = null;
  if (b > 0.3) {
    const H = 100 + 22 * b;
    const s = 0.7 + 0.5 * b;
    const stalk = `M150 175 C150 ${f(175 - H * 0.5)} ${f(152)} ${f(175 - H * 0.8)} ${f(153)} ${f(175 - H)}`;
    flower = (
      <G>
        <Tube d={stalk} w={2} fill={stemColor} />
        <G transform={`translate(153 ${f(175 - H + 2)}) scale(${f(s)})`}>
          <Path d="M0 0 C-12 -8 -13 -30 0 -48 C13 -30 12 -8 0 0Z" fill={tone('#FBF3D9')} stroke={ink} strokeWidth={1.1} strokeLinejoin="round" />
          <Path d="M0 0 C-6 -10 -6 -30 0 -46" fill="none" stroke={ink} strokeWidth={0.6} opacity={0.45} />
          <Path d="M-2.8 -6 L-2.8 -29 Q0 -34 2.8 -29 L2.8 -6Z" fill={tone('#F1DE92')} stroke={ink} strokeWidth={1} strokeLinejoin="round" />
        </G>
      </G>
    );
  }

  return (
    <G>
      {leaves}
      {flower}
    </G>
  );
}
