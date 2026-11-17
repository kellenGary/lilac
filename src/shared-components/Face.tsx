import Svg, { Circle, Path } from 'react-native-svg';

import { useColors } from '@/state/theme';

// Eyes and mouth for each step, rough to great. Drawn on a 44-unit square.
const EYES = ['M15 17v4M29 17v4', 'M15 17v4M29 17v4', 'M15 17v4M29 17v4', 'M15 17v4M29 17v4', 'M15 16v5M29 16v5'];
const MOUTHS = [
  'M14.5 31c3.5-5 11.5-5 15 0',
  'M15.5 29.5c3-3 10-3 13 0',
  'M15.5 29h13',
  'M15 27c3 4 11 4 14 0',
  'M13.5 26c3.5 6.5 13.5 6.5 17 0z',
];

/**
 * A face for one of the five feelings, drawn as a plain outline so the page stays calm. The chosen one fills with
 * lilac. The line is the page's text color, so it suits light and dark.
 */
export function Face({ level, size = 40, selected }: { level: number; size?: number; selected?: boolean }) {
  const { ink, lilac } = useColors();
  const i = Math.max(1, Math.min(5, level)) - 1;
  return (
    <Svg width={size} height={size} viewBox="0 0 44 44" fill="none" accessibilityLabel={`Feeling ${level} of 5`}>
      <Circle cx={22} cy={22} r={19} fill={selected ? lilac : 'none'} stroke={ink} strokeWidth={2.4} />
      <Path d={EYES[i]} stroke={ink} strokeWidth={2.6} strokeLinecap="round" />
      <Path
        d={MOUTHS[i]}
        stroke={ink}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={i === 4 ? ink : 'none'}
      />
    </Svg>
  );
}
