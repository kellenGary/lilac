import { Pressable, Text, View } from 'react-native';

import { useTweenedNumber } from '@/lib/animation';

// Track and thumb are sized in style (not classes) so every platform renders the same geometry: the thumb is
// centered vertically and has equal inset on the top, bottom and the edge it rests against.
const TRACK_W = 44;
const TRACK_H = 26;
const THUMB = 20;
const INSET = (TRACK_H - THUMB) / 2;

type SwitchProps = {
  /** Shown beside the switch. Omit when the switch sits in a row that already has a title, and pass `accessibilityLabel`. */
  label?: string;
  accessibilityLabel?: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

export function Switch({ label, accessibilityLabel, value, onChange }: SwitchProps) {
  const left = useTweenedNumber(value ? TRACK_W - THUMB - INSET : INSET, 220);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      className={`min-h-11 flex-row items-center gap-4 ${label ? 'justify-between' : 'justify-end'}`}
    >
      {label && <Text className="text-[15px] text-ink">{label}</Text>}
      <View
        className={`rounded-full ${value ? 'bg-ink' : 'bg-edge'}`}
        style={{ width: TRACK_W, height: TRACK_H, flexShrink: 0, flexGrow: 0 }}
      >
        <View style={{ position: 'absolute', top: 0, bottom: 0, left, width: THUMB, justifyContent: 'center' }}>
          <View className="rounded-full bg-cream" style={{ width: THUMB, height: THUMB }} />
        </View>
      </View>
    </Pressable>
  );
}
