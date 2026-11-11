import Svg, { Circle, Path } from 'react-native-svg';

import { useColors, useTheme } from '@/state/theme';

// Soft fill for each step, rough to great.
const FILLS = ['#E3C2AE', '#EAD7B0', '#EEE4BA', '#D8E5BB', '#BCD79C'];
// Dark mode: richer, deeper tones instead of the pastels mixed toward grey, which looked muddy on the dark page.
const DARK_FILLS = ['#CB7F69', '#D49F5C', '#D6C265', '#9ABD6E', '#6FAE58'];
const MOUTHS = [
  'M12.5 27 Q20 19.5 27.5 27',
  'M13 26.2 Q20 22 27 26.2',
  'M13.5 25 L26.5 25',
  'M13 23.2 Q20 28.5 27 23.2',
  'M13 23 C14 29 26 29 27 23',
];

/** A simple drawn face for one of the five feelings. */
export function Face({ level, size = 40, selected }: { level: number; size?: number; selected?: boolean }) {
  const { ink, cream } = useColors();
  const { isDark } = useTheme();
  const i = Math.max(1, Math.min(5, level)) - 1;
  const fill = isDark ? DARK_FILLS[i] : FILLS[i];
  // On the brighter dark-mode fills, the eyes and mouth read better in the page's dark color than in cream.
  const features = isDark ? cream : ink;
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityLabel={`Feeling ${level} of 5`}>
      {selected && <Circle cx={20} cy={20} r={19} fill="none" stroke={ink} strokeWidth={1.4} />}
      <Circle cx={20} cy={20} r={selected ? 16 : 17} fill={fill} stroke={ink} strokeWidth={1.4} />
      <Circle cx={14.5} cy={16} r={1.7} fill={features} />
      <Circle cx={25.5} cy={16} r={1.7} fill={features} />
      <Path d={MOUTHS[i]} fill="none" stroke={features} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}
