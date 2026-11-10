import type { ReactNode } from 'react';
import { G, Path } from 'react-native-svg';

import { bloomOf, f, ink, mix, Tube, useTone, wilt, type BodyProps } from './shared';

/*
 * Succulent: a low rosette of thick, pointed leaves, blush at the tips; in bloom, a flower stalk of tiny bells.
 *   growth -> more layers of leaves, and a flower stalk
 *   tension -> leaves stand tight and narrow, like a closed fist
 *   droop -> leaves splay open and flop, wrinkle to yellow-brown; the outer layers drop
 */

const SAGE_A = '#B9D0B4';
const SAGE_B = '#A5C3A5';
const BLUSH = '#E49A8F';
const BELL = '#F2A889';

function Pad({
  x,
  y,
  deg,
  L,
  fill,
  a,
  d,
  wide = 1,
}: {
  x: number;
  y: number;
  deg: number;
  L: number;
  fill: string;
  a: number;
  d: number;
  /** Foreshortened leaves, pointing toward the viewer, look short and broad. */
  wide?: number;
}) {
  const tone = useTone();
  const hw = 0.5 * (1 - a * 0.34) * (1 - d * 0.18) * wide;
  const body = `M0 0 C${f(0.14 * L)} ${f(-0.42 * L * hw * 1.2)} ${f(0.62 * L)} ${f(-0.5 * L * hw * 1.2)} ${f(L)} 0 C${f(0.62 * L)} ${f(0.5 * L * hw * 1.2)} ${f(0.14 * L)} ${f(0.42 * L * hw * 1.2)} 0 0Z`;
  const tip = `M${f(0.68 * L)} ${f(-0.2 * L * hw * 1.2)} Q${f(0.9 * L)} ${f(-0.1 * L * hw)} ${f(L)} 0 Q${f(0.9 * L)} ${f(0.1 * L * hw)} ${f(0.68 * L)} ${f(0.2 * L * hw * 1.2)}Z`;
  const lower = `M0 0 L${f(L)} 0 C${f(0.62 * L)} ${f(0.5 * L * hw * 1.2)} ${f(0.14 * L)} ${f(0.42 * L * hw * 1.2)} 0 0Z`;
  return (
    <G transform={`translate(${f(x)} ${f(y)}) rotate(${f(deg)})`}>
      <Path d={body} fill={tone(fill)} stroke={ink} strokeWidth={1.15} strokeLinejoin="round" />
      <Path d={lower} fill={ink} opacity={0.09} />
      <Path d={tip} fill={BLUSH} opacity={0.5 * (1 - d)} />
      <Path d={`M${f(0.1 * L)} 0 L${f(0.84 * L)} 0`} stroke={ink} strokeWidth={0.6} opacity={0.35} strokeLinecap="round" />
      {d > 0.3 && (
        <Path
          d={`M${f(0.3 * L)} ${f(-0.12 * L * hw)} Q${f(0.36 * L)} 0 ${f(0.3 * L)} ${f(0.12 * L * hw)}M${f(0.5 * L)} ${f(-0.14 * L * hw)} Q${f(0.56 * L)} 0 ${f(0.5 * L)} ${f(0.14 * L * hw)}`}
          stroke={ink}
          strokeWidth={0.6}
          fill="none"
          opacity={0.45}
        />
      )}
    </G>
  );
}

export function SucculentBody({ growth: g, tension: a, droop: d, lost }: BodyProps) {
  const tone = useTone();
  const size = 0.7 + 0.42 * g;
  const layers = 2 + Math.round(g * 3); // 2..5
  const first = Math.min(lost, layers - 2); // outer layers drop first
  const pads: ReactNode[] = [];

  for (let k = first; k < layers; k++) {
    const r = layers === 1 ? 0 : k / (layers - 1); // 0 = outermost, 1 = innermost
    const spread = Math.min(124, (80 - 64 * r) * (1 - 0.42 * a) + d * (36 - 14 * r));
    const L = (64 - 28 * r) * size * (1 - 0.2 * d);
    const fill = wilt(k % 2 ? SAGE_A : SAGE_B, d);
    const angles = r > 0.6 ? [-spread, spread, 0] : [-spread, -spread * 0.5, spread * 0.5, spread];
    const inset = 7 - 5 * r;
    [...angles]
      .sort((p, q) => Math.abs(q) - Math.abs(p))
      .forEach((ang, j) => {
        const side = ang < 0 ? -1 : 1;
        pads.push(
          <Pad
            key={`${k}-${j}`}
            x={150 + side * inset * (ang === 0 ? 0 : 1)}
            y={173}
            deg={-90 + ang}
            L={L}
            fill={fill}
            a={a}
            d={d}
          />,
        );
      });
  }

  // Seen from the side, some leaves point at the viewer: short, broad, overlapping the middle, the outer ones
  // draping over the rim. Drawn last so they sit in front.
  const lowest = Math.max(first, 0);
  const outerSpread = Math.min(124, (80 - 0) * (1 - 0.42 * a) + d * 36);
  const outerL = (64 - 0) * size * (1 - 0.2 * d);
  [-1, 1].forEach((side) => {
    pads.push(
      <Pad
        key={`front-out-${side}`}
        x={150 + side * 9}
        y={173}
        deg={-90 + side * Math.min(150, outerSpread + 22 + d * 24)}
        L={outerL * 0.62}
        fill={wilt(lowest % 2 ? SAGE_A : SAGE_B, d)}
        a={a}
        d={d}
        wide={1.35}
      />,
    );
  });
  if (layers >= 3) {
    const midL = (64 - 28 * 0.5) * size * (1 - 0.2 * d);
    const midSpread = (80 - 64 * 0.5) * (1 - 0.42 * a) + d * 25;
    [-1, 1].forEach((side) => {
      pads.push(
        <Pad
          key={`front-mid-${side}`}
          x={150 + side * 3}
          y={173}
          deg={-90 + side * (midSpread * 0.55 + 6)}
          L={midL * 0.6}
          fill={wilt(SAGE_A, d)}
          a={a}
          d={d}
          wide={1.3}
        />,
      );
    });
  }

  // In bloom: a stalk rises from the middle, hung with small bells.
  const b = bloomOf(g, d);
  let stalk: ReactNode = null;
  if (b > 0.05) {
    const H = 44 + 66 * b;
    const px = (t: number) => 150 + 5 * Math.sin(t * 3) + 28 * t * t;
    const py = (t: number) => 172 - H * t;
    const path = Array.from({ length: 13 }, (_, i) => `${i ? 'L' : 'M'}${f(px(i / 12))} ${f(py(i / 12))}`).join(' ');
    const bells = 2 + Math.round(b * 4);
    stalk = (
      <G>
        <Tube d={path} w={2.2} fill={tone(mix('#98B27A', '#C9B88A', d))} />
        {Array.from({ length: bells }, (_, i) => {
          const t = 0.5 + (0.5 * (i + 1)) / bells;
          const side = i % 2 ? 1 : -1;
          const bx = px(t) + side * 7;
          const by = py(t) + 6;
          return (
            <G key={i}>
              <Path
                d={`M${f(px(t))} ${f(py(t))} Q${f(px(t) + side * 5)} ${f(py(t) - 1)} ${f(bx)} ${f(by)}`}
                fill="none"
                stroke={ink}
                strokeWidth={0.9}
                strokeLinecap="round"
              />
              <G transform={`translate(${f(bx)} ${f(by)}) scale(${f(0.8 + 0.4 * b)})`}>
                <Path
                  d="M0 0 C-5 2 -6.5 9 -4.5 14 L4.5 14 C6.5 9 5 2 0 0Z"
                  fill={tone(BELL)}
                  stroke={ink}
                  strokeWidth={1}
                  strokeLinejoin="round"
                />
                <Path d="M-2 14 L0 10 L2 14" fill="none" stroke={ink} strokeWidth={0.6} opacity={0.6} />
              </G>
            </G>
          );
        })}
      </G>
    );
  }

  return (
    <G>
      {stalk}
      {pads}
    </G>
  );
}
