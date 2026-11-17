import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { formatMonthDay, formatWeekday } from '@/lib/dates';
import { useAuth } from '@/state/auth';
import { useColors, useTheme } from '@/state/theme';
import { phaseAt, type Phase } from '@/theme/palettes';

// One flat tint per time of day, for a quiet pop of color. Darker versions for the dark page.
const TINT: Record<'light' | 'dark', Record<Phase, string>> = {
  light: { dawn: '#FCEBD9', day: '#FBF0C6', dusk: '#F6DDD9', night: '#DDD3EE' },
  dark: { dawn: '#3A2F28', day: '#3A3520', dusk: '#3A2A30', night: '#2E2745' },
};

function greeting(hour: number): string {
  if (hour < 5) return 'Up late';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

const SUN = '#F4DE8A';

/** A thin-lined cartoon of the sky: a full sun by day, a low sun at dawn and dusk, a moon at night. */
function Sky({ phase, ink }: { phase: Phase; ink: string }) {
  const pen = { stroke: ink, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <Svg width={60} height={60} viewBox="0 0 64 64" fill="none">
      {phase === 'day' && (
        <>
          <Circle cx={32} cy={32} r={11} fill={SUN} {...pen} />
          <Path d="M32 8v6M32 50v6M8 32h6M50 32h6M15 15l4.2 4.2M44.8 44.8 49 49M49 15l-4.2 4.2M19.2 44.8 15 49" {...pen} />
        </>
      )}
      {(phase === 'dawn' || phase === 'dusk') && (
        <>
          <Path d="M18 42a14 14 0 0 1 28 0z" fill={SUN} {...pen} />
          <Path d="M8 42h48M32 16v6M14 24l4 4M50 24l-4 4" {...pen} />
        </>
      )}
      {phase === 'night' && (
        <>
          <Path d="M40 12a20 20 0 1 0 12 30 16 16 0 0 1-12-30z" fill={SUN} {...pen} />
          <Path d="M50 14v6M47 17h6M54 28v4M52 30h4" {...pen} strokeWidth={1.8} />
        </>
      )}
    </Svg>
  );
}

/** Today's date, a greeting for the time of day, and a small sky drawing, on a tint that follows the hour. */
export function DateCard({ today }: { today: string }) {
  const { ink } = useColors();
  const { isDark } = useTheme();
  const { firstName } = useAuth();
  const now = new Date();
  const phase = phaseAt(now);
  return (
    <View
      className="flex-row items-center justify-between rounded-[22px] py-4 pl-5 pr-4"
      style={{ backgroundColor: TINT[isDark ? 'dark' : 'light'][phase] }}
      accessible
      accessibilityLabel={`${formatWeekday(today)}, ${formatMonthDay(today)}. ${greeting(now.getHours())}${firstName ? `, ${firstName}` : ''}.`}
    >
      <View>
        <Text className="text-[11px] font-semibold uppercase tracking-[1.3px] text-purple">{formatWeekday(today)}</Text>
        <Text className="mt-0.5 text-[24px] font-semibold leading-8 tracking-tight text-ink">{formatMonthDay(today)}</Text>
        <Text numberOfLines={1} className="mt-0.5 max-w-[210px] text-[14px] font-medium text-purple">
          {greeting(now.getHours())}
          {firstName ? `, ${firstName}` : ''}
        </Text>
      </View>
      <Sky phase={phase} ink={ink} />
    </View>
  );
}
