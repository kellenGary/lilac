import { useRouter, usePathname } from 'expo-router';
import { Pressable } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useColors } from '@/state/theme';

/** A gear: eight rounded teeth around a ring, drawn as one outline. */
function gearPath(cx: number, cy: number, outer: number, inner: number, teeth: number): string {
  const step = (Math.PI * 2) / teeth;
  const pts: [number, number][] = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step - Math.PI / 2;
    for (const [da, r] of [
      [-0.3, inner],
      [-0.17, outer],
      [0.17, outer],
      [0.3, inner],
    ] as const) {
      pts.push([cx + Math.cos(a + da * step * 1.4) * r, cy + Math.sin(a + da * step * 1.4) * r]);
    }
  }
  return `M ${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L ')} Z`;
}
const GEAR = gearPath(12, 12, 10, 7.6, 8);

/** The settings gear in the top right of a page header. Opens Settings. */
export function SettingsButton() {
  const router = useRouter();
  const active = usePathname().startsWith('/settings');
  const { ink } = useColors();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Settings"
      accessibilityState={{ selected: active }}
      onPress={() => !active && router.push('/settings')}
      className="h-11 w-11 items-center justify-center rounded-full hover:opacity-70"
    >
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path d={GEAR} stroke={ink} strokeWidth={1.8} strokeLinejoin="round" />
        <Circle cx={12} cy={12} r={3} stroke={ink} strokeWidth={1.8} />
      </Svg>
    </Pressable>
  );
}
