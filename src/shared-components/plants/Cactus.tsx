import type { ReactNode } from 'react';
import { Circle, Ellipse, G, Line, Path } from 'react-native-svg';

import { bloomOf, clamp01, f, ink, mix, stemX, stemY, Tube, useTone, wilt, type BodyProps } from './shared';

/*
 * Cactus: a tall ribbed column with arms; in bloom, a pink flower on top.
 *   growth -> taller, arms grow in one at a time, then a flower
 *   tension -> bristling: longer, denser spines and a slight kink
 *   droop -> the column bows and wrinkles, the arms hang, the green turns yellow-brown
 */

const GREEN = '#9DBE94';
const PINK = '#F2A7BB';

function Flower({ s, d }: { s: number; d: number }) {
  const tone = useTone();
  return (
    <G transform={`scale(${f(s)})`}>
      {[-70, -42, -14, 14, 42, 70].map((deg) => (
        <Ellipse
          key={deg}
          cx={0}
          cy={-9}
          rx={4.2}
          ry={9.5}
          fill={tone(mix(PINK, '#B8976A', d))}
          stroke={ink}
          strokeWidth={0.9}
          transform={`rotate(${deg})`}
        />
      ))}
      <Circle r={4.6} fill={tone('#F1DE92')} stroke={ink} strokeWidth={1} />
      <Circle cx={-1.4} cy={-1} r={0.5} fill={ink} opacity={0.6} />
      <Circle cx={1.5} cy={0.6} r={0.5} fill={ink} opacity={0.6} />
    </G>
  );
}

function Bud({ s }: { s: number }) {
  const tone = useTone();
  return (
    <G transform={`scale(${f(s)})`}>
      <Path d="M0 2 C-7 -2 -7 -14 0 -20 C7 -14 7 -2 0 2Z" fill={tone(PINK)} stroke={ink} strokeWidth={1.1} strokeLinejoin="round" />
      <Path d="M0 0 C-2 -7 -2 -13 0 -18" fill="none" stroke={ink} strokeWidth={0.6} opacity={0.5} />
    </G>
  );
}

export function CactusBody({ growth: g, tension: a, droop: d, carry: c }: BodyProps) {
  const tone = useTone();
  const H = 46 + 92 * g;
  const W = 28 + 4 * c;
  const fill = tone(wilt(GREEN, d));
  const px = (h: number) => stemX(h, a * 0.6, d * 0.8);

  const pts: [number, number][] = [];
  for (let h = 0; h < H; h += 4) pts.push([px(h), stemY(h)]);
  pts.push([px(H), stemY(H)]);
  const along = (dx: number) => `M${pts.map(([x, y]) => `${f(x + dx)} ${f(y)}`).join(' L')}`;

  // spines: short ticks along both edges, longer and closer together with tension
  const step = a > 0.5 ? 9 : 13;
  const spines: ReactNode[] = [];
  for (let h = 12; h < H - 4; h += step) {
    const x = px(h);
    const y = stemY(h);
    const len = 3.6 + a * 4;
    spines.push(
      <G key={h}>
        <Line x1={f(x - W / 2)} y1={f(y)} x2={f(x - W / 2 - len)} y2={f(y - len * 0.7)} stroke={ink} strokeWidth={0.8} strokeLinecap="round" />
        <Line x1={f(x + W / 2)} y1={f(y - 4)} x2={f(x + W / 2 + len)} y2={f(y - 4 - len * 0.7)} stroke={ink} strokeWidth={0.8} strokeLinecap="round" />
      </G>,
    );
  }

  // arms: out from the trunk, then up (or hanging, when depressed)
  const arm = (side: 1 | -1, at: number, need: number) => {
    const fr = clamp01((g - need) / 0.22);
    if (fr <= 0 || at * H > H - 14) return null;
    const h = at * H;
    const x0 = px(h) + side * (W / 2 - 4);
    const y0 = stemY(h);
    const x1 = x0 + side * (20 + 8 * fr);
    const sag = clamp01((d - 0.35) / 0.4);
    // Healthy arms rise; as depression grows they level out, then droop a little at the tip.
    const rise = (1 - 1.6 * sag) * (22 + 36 * g) * fr;
    const up = rise < 0 ? rise * 0.3 : rise;
    const path = `M${f(x0)} ${f(y0)} Q${f(x1)} ${f(y0)} ${f(x1)} ${f(y0 - 12 * (1 - sag))} L${f(x1)} ${f(y0 - up)}`;
    return (
      <G key={`${side}`}>
        <Tube d={path} w={W * 0.5} fill={fill} />
        <Path
          d={`M${f(x1)} ${f(y0 - 10)} L${f(x1)} ${f(y0 - up + 2)}`}
          stroke={ink}
          strokeWidth={0.7}
          opacity={0.3}
          fill="none"
        />
      </G>
    );
  };

  const b = bloomOf(g, d);
  const topX = px(H);
  const topY = stemY(H);
  const wrinkles = clamp01((d - 0.3) * 1.6);

  return (
    <G>
      {spines}
      {arm(-1, 0.4, 0.25)}
      {arm(1, 0.6, 0.48)}
      <Tube d={along(0)} w={W} fill={fill} />
      <Path d={along(-W * 0.27)} fill="none" stroke={ink} strokeWidth={0.7} opacity={0.3} strokeLinecap="round" />
      <Path d={along(W * 0.27)} fill="none" stroke={ink} strokeWidth={0.7} opacity={0.3} strokeLinecap="round" />
      <Path d={along(0)} fill="none" stroke={ink} strokeWidth={0.6} opacity={0.2} strokeLinecap="round" />
      {wrinkles > 0.05 &&
        [0.3, 0.5, 0.7].map((t) => (
          <Path
            key={t}
            d={`M${f(px(H * t) - W * 0.4)} ${f(stemY(H * t))} q${f(W * 0.4)} ${f(4 * wrinkles)} ${f(W * 0.8)} 0`}
            fill="none"
            stroke={ink}
            strokeWidth={0.7}
            opacity={0.4 * wrinkles}
          />
        ))}
      {b > 0.5 ? (
        <G transform={`translate(${f(topX)} ${f(topY - W * 0.2)})`}>
          <Flower s={0.7 + 0.6 * ((b - 0.5) / 0.5)} d={d} />
        </G>
      ) : b > 0.05 ? (
        <G transform={`translate(${f(topX)} ${f(topY - W * 0.3)})`}>
          <Bud s={0.7 + b} />
        </G>
      ) : null}
    </G>
  );
}
