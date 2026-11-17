import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useColors } from '@/state/theme';

/** A small outlined "i" button. Tap it to show or hide the note it belongs to (the parent owns that state). */
export function InfoButton({
  open,
  onPress,
  label,
  size = 16,
}: {
  open: boolean;
  onPress: () => void;
  label: string;
  size?: number;
}) {
  const { purple } = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      hitSlop={12}
      className="hover:opacity-70"
      // @ts-expect-error web only: a hover hint
      title={label}
    >
      <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <Circle cx={10} cy={10} r={8.25} stroke={purple} strokeWidth={1.4} fill={open ? `${purple}22` : 'none'} />
        <Path d="M10 9v4.5" stroke={purple} strokeWidth={1.6} strokeLinecap="round" />
        <Circle cx={10} cy={6.4} r={1} fill={purple} />
      </Svg>
    </Pressable>
  );
}

/** The note an info button reveals: quiet text under the heading. */
export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <View className="mt-2 max-w-[52ch] rounded-2xl bg-lilac/20 px-3.5 py-2.5">
      <Text className="text-[13px] leading-[19px] text-body">{children}</Text>
    </View>
  );
}

/** A heading with an info button beside it; the note opens underneath. */
export function InfoHeading({
  label,
  note,
  children,
}: {
  /** Names the button for screen readers, e.g. "About experiments". */
  label: string;
  note: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <View className="flex-row items-center gap-2">
        {children}
        <InfoButton open={open} onPress={() => setOpen((v) => !v)} label={label} />
      </View>
      {open && <InfoNote>{note}</InfoNote>}
    </View>
  );
}
