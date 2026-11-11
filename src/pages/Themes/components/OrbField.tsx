import { useMemo, useState } from 'react';
import { Platform, Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { entriesInWindow, layoutOrbs, orbColor, orbStates } from '@/lib/orbs';
import { themeLabel } from '@/lib/themes';
import type { Entry } from '@/lib/types';
import { useColors } from '@/state/theme';

const HEIGHT = 440;
/** How far the glow reaches past the orb's label area. */
const GLOW = 1.45;
const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

/**
 * One glowing orb per theme. Where an orb sits comes from the whole history (so it stays put as you scrub); its size
 * and color come from the 30 days in view: bigger when you wrote about it more, warmer when those days felt rougher.
 */
export function OrbField({
  entries,
  end,
  onSelect,
}: {
  /** Every entry, newest first. */
  entries: Entry[];
  /** Last day of the window in view. */
  end: string;
  onSelect: (theme: string) => void;
}) {
  const { ink, muted } = useColors();
  const [width, setWidth] = useState(0);
  const orbs = useMemo(() => layoutOrbs(entries, width, HEIGHT), [entries, width]);
  const states = useMemo(() => orbStates(orbs, entriesInWindow(entries, end)), [orbs, entries, end]);

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width))}
      style={{ height: HEIGHT, width: '100%' }}
    >
      {width > 0 && (
        <Svg width={width} height={HEIGHT} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
          <Defs>
            {states.map((o) => {
              const color = o.feeling === null ? muted : orbColor(o.feeling);
              return (
                <RadialGradient
                  key={o.theme}
                  id={`orb-${o.theme}`}
                  cx={o.x}
                  cy={o.y}
                  r={o.radius * GLOW}
                  gradientUnits="userSpaceOnUse"
                >
                  <Stop offset="0" stopColor={color} stopOpacity={0.68} />
                  <Stop offset="0.15" stopColor={color} stopOpacity={0.56} />
                  <Stop offset="0.35" stopColor={color} stopOpacity={0.36} />
                  <Stop offset="0.6" stopColor={color} stopOpacity={0.16} />
                  <Stop offset="0.82" stopColor={color} stopOpacity={0.06} />
                  <Stop offset="1" stopColor={color} stopOpacity={0} />
                </RadialGradient>
              );
            })}
          </Defs>
          {states.map((o) => (
            <Circle
              key={o.theme}
              cx={o.x}
              cy={o.y}
              r={o.radius * GLOW}
              fill={`url(#orb-${o.theme})`}
              opacity={o.entries.length ? 1 : 0.3}
            />
          ))}
        </Svg>
      )}
      {states.map((o) => {
        const days = o.entries.length;
        return (
          <Pressable
            key={o.theme}
            accessibilityRole="button"
            accessibilityLabel={`${themeLabel(o.theme)}, ${days} ${days === 1 ? 'day' : 'days'} in view`}
            disabled={days === 0}
            onPress={() => onSelect(o.theme)}
            style={{
              position: 'absolute',
              left: o.x - o.radius,
              top: o.y - o.radius,
              width: o.radius * 2,
              height: o.radius * 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: mono,
                fontSize: 12,
                fontWeight: '700',
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: days ? ink : muted,
                opacity: days ? 1 : 0.6,
              }}
            >
              {themeLabel(o.theme)}
            </Text>
            {days > 0 && (
              <Text style={{ fontFamily: mono, fontSize: 10.5, fontWeight: '600', color: ink, opacity: 0.8, marginTop: 2 }}>
                {days} {days === 1 ? 'day' : 'days'}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
