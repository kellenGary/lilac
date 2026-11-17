import Svg, { Circle } from 'react-native-svg';

import { useColors } from '@/state/theme';

/**
 * The app's mark: a single lilac floret, four petals around a butter-yellow center. The petals and center keep their
 * colors on light and dark pages; only the outline follows the text color.
 */
export function FaceMark({ size = 24 }: { size?: number }) {
  const { ink } = useColors();
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Circle cx={20} cy={10} r={7.5} fill="#B9A3DC" stroke={ink} strokeWidth={2.4} />
      <Circle cx={30} cy={20} r={7.5} fill="#B9A3DC" stroke={ink} strokeWidth={2.4} />
      <Circle cx={20} cy={30} r={7.5} fill="#B9A3DC" stroke={ink} strokeWidth={2.4} />
      <Circle cx={10} cy={20} r={7.5} fill="#B9A3DC" stroke={ink} strokeWidth={2.4} />
      <Circle cx={20} cy={20} r={5.2} fill="#F4DE8A" stroke={ink} strokeWidth={2.4} />
    </Svg>
  );
}
