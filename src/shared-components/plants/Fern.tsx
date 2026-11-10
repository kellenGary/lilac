import { Circle, G, Path } from 'react-native-svg';

import { colors } from '@/theme/colors';
import { clamp01, f, ink, lensPath, mix, rad, useTone, wilt, type BodyProps } from './shared';

/*
 * Fern: fronds arching out of the base, each lined with pairs of small leaflets.
 *   growth -> more and longer fronds, plus a new curled fiddlehead in the middle
 *   tension -> stiff, upright fronds with narrow leaflets
 *   droop -> fronds sag toward the pot, leaflets yellow and the tips go bare
 */

const STEPS = 11;

type Frond = { key: number; rib: string; leaflets: string; fill: string };

/** The fronds' geometry, shared by the stem layer (FernBody) and the leaf layer (FernFront). */
function fernGeometry({ growth: g, tension: a, droop: d, lost }: BodyProps): Frond[] {
  const count = Math.max(2, 3 + Math.round(g * 5) - Math.min(lost, 2));
  const fronds: Frond[] = [];

  const order = Array.from({ length: count }, (_, i) => i).sort(
    (p, q) => Math.abs(q / (count - 1) - 0.5) - Math.abs(p / (count - 1) - 0.5),
  );
  order.forEach((i, drawIndex) => {
    const u = count === 1 ? 0 : (i / (count - 1)) * 2 - 1; // -1 (far left) .. 1 (far right)
    const out = u < 0 ? -1 : u > 0 ? 1 : i % 2 ? 1 : -1;
    const start = Math.abs(u) * (64 - a * 16) + 5; // heading at the base, degrees from vertical
    const len = (46 + 70 * g) * (1 - 0.34 * Math.abs(u)) * (1 - d * 0.12);
    const curl = (52 + 118 * d) * (1 - 0.55 * a); // how far the frond bends outward and down along its length
    const ds = len / STEPS;

    let x = 150;
    let y = 175;
    const pts: { x: number; y: number; heading: number }[] = [{ x, y, heading: start }];
    for (let k = 1; k <= STEPS; k++) {
      const t = k / STEPS;
      const heading = start + curl * Math.pow(t, 1.35);
      x += out * Math.sin(rad(heading)) * ds;
      y -= Math.cos(rad(heading)) * ds;
      pts.push({ x, y, heading });
    }
    const rib = pts.map((p, k) => `${k ? 'L' : 'M'}${f(p.x)} ${f(p.y)}`).join(' ');

    // Leaflets in pairs along the frond; depression strips them from the tip back.
    const bare = Math.floor(d * 4);
    const base = drawIndex % 2 ? colors.leafLight : colors.leafMid;
    const lmax = (12 + 7 * g) * (0.9 + 0.1 * (1 - Math.abs(u)));
    const widthK = 0.36 * (1 - a * 0.42);
    let leaflets = '';
    for (let k = 3; k <= STEPS - bare; k++) {
      const p = pts[k];
      const t = k / STEPS;
      const l = lmax * Math.pow(1 - t * 0.86, 0.8);
      // screen angle of the frond here (0 = right, clockwise): up is -90
      const tangent = out === 1 ? p.heading - 90 : 270 - p.heading;
      const spread = 62 - a * 14 + d * 14;
      leaflets += lensPath(p.x, p.y, tangent + spread, l, l * widthK);
      leaflets += lensPath(p.x, p.y, tangent - spread, l, l * widthK);
    }
    const tip = pts[STEPS - bare];
    const tipAngle = out === 1 ? tip.heading - 90 : 270 - tip.heading;
    leaflets += lensPath(tip.x, tip.y, tipAngle, lmax * 0.55, lmax * 0.55 * widthK);

    fronds.push({ key: i, rib, leaflets, fill: wilt(base, d) });
  });
  return fronds;
}

/** The stems: they rise out of the soil, so this layer sits behind the front of the pot. */
export function FernBody(props: BodyProps) {
  const tone = useTone();
  const { growth: g, droop: d } = props;
  const fiddle = clamp01((g - 0.3) / 0.3) * clamp01(1 - d * 1.5);
  const fh = (24 + 36 * g) * fiddle;
  const stem = `M150 175 C150 ${f(175 - fh * 0.5)} ${f(150 + 2)} ${f(175 - fh * 0.85)} ${f(150 + 6)} ${f(175 - fh)}`;
  return (
    <G>
      {fernGeometry(props).map((fr) => (
        <Path key={fr.key} d={fr.rib} fill="none" stroke={ink} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {fiddle > 0.05 && (
        <>
          <Path d={stem} fill="none" stroke={ink} strokeWidth={4.2} strokeLinecap="round" />
          <Path d={stem} fill="none" stroke={tone(mix('#98B27A', '#C9B88A', d))} strokeWidth={2} strokeLinecap="round" />
        </>
      )}
    </G>
  );
}


/** The leaves: drawn in front of the pot, so fronds can drape over the rim. */
export function FernFront(props: BodyProps) {
  const tone = useTone();
  const { growth: g, droop: d } = props;
  const fiddle = clamp01((g - 0.3) / 0.3) * clamp01(1 - d * 1.5);
  const fh = (24 + 36 * g) * fiddle;
  return (
    <G>
      {fernGeometry(props).map((fr) => (
        <Path key={fr.key} d={fr.leaflets} fill={tone(fr.fill)} stroke={ink} strokeWidth={0.8} strokeLinejoin="round" />
      ))}
      {fiddle > 0.05 && (
        <G>
          <Circle cx={159} cy={175 - fh - 1} r={5.6 * fiddle + 1} fill={tone(colors.leafNew)} stroke={ink} strokeWidth={1.1} />
          <Path
            d={`M${f(159 - 2.2)} ${f(175 - fh - 1)} a2.2 2.2 0 1 1 2.2 2.2`}
            fill="none"
            stroke={ink}
            strokeWidth={0.8}
            opacity={0.7}
          />
        </G>
      )}
    </G>
  );
}
