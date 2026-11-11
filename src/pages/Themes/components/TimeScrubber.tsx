import { useMemo, useState } from 'react';
import { Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';

import { WINDOW_DAYS } from '@/lib/orbs';
import { useColors } from '@/state/theme';

const HEIGHT = 34;

/**
 * A strip of ticks, one per week. Drag it to move the window back in time; the right edge is today.
 * `offset` is how many weeks back the window ends (0 = today).
 */
export function TimeScrubber({
  weeks,
  offset,
  onChange,
  endLabel,
}: {
  /** How many weeks back the strip reaches. */
  weeks: number;
  offset: number;
  onChange: (offset: number) => void;
  /** Text for the window's last day, e.g. "Today" or "Oct 12". */
  endLabel: string;
}) {
  const { ink, line } = useColors();
  const [width, setWidth] = useState(0);
  const ticks = useMemo(() => Array.from({ length: weeks + 1 }, (_, i) => weeks - i), [weeks]); // left = oldest

  // Dragging anywhere on the strip sets the window; the strip's width maps to the whole range.
  const scrub = (e: GestureResponderEvent) => {
    if (!width) return;
    const frac = Math.max(0, Math.min(1, e.nativeEvent.locationX / width));
    onChange(Math.round((1 - frac) * weeks));
  };

  // Window covers about WINDOW_DAYS / 7 ticks to the left of the end.
  const span = Math.ceil(WINDOW_DAYS / 7);

  return (
    <View className="gap-2">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-sm font-semibold text-ink">{endLabel}</Text>
        <Text className="text-xs text-muted">Last {WINDOW_DAYS} days up to here. Drag to look back.</Text>
      </View>
      <View
        accessibilityRole="adjustable"
        accessibilityLabel="Time window"
        accessibilityValue={{ text: endLabel }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) =>
          onChange(Math.max(0, Math.min(weeks, offset + (e.nativeEvent.actionName === 'decrement' ? 1 : -1))))
        }
        onLayout={(e: LayoutChangeEvent) => {
          setWidth(e.nativeEvent.layout.width);
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={scrub}
        onResponderMove={scrub}
        style={{ height: HEIGHT, justifyContent: 'center' }}
      >
        <View pointerEvents="none" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          {width > 0 &&
            ticks.map((off) => {
              const inView = off >= offset && off < offset + span;
              const here = off === offset;
              return (
                <View
                  key={off}
                  style={{
                    width: 1.5,
                    height: here ? 30 : inView ? 22 : 14,
                    borderRadius: 1,
                    backgroundColor: inView ? ink : line,
                    opacity: here ? 1 : inView ? 0.7 : 1,
                  }}
                />
              );
            })}
        </View>
      </View>
    </View>
  );
}

