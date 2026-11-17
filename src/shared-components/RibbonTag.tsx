import { useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useColors } from '@/state/theme';

// A bookmark ribbon: it keeps its lilac and black on light and dark pages, like a real sticker would.
const RIBBON = '#B9A3DC';
const BLACK = '#17161A';

/** A small label shaped like a bookmark ribbon, with a notch in the end. */
export function RibbonTag({ label }: { label: string }) {
  const { ink } = useColors();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((s) => (Math.abs(s.w - width) < 0.5 && Math.abs(s.h - height) < 0.5 ? s : { w: width, h: height }));
  };
  const { w, h } = size;
  return (
    <View onLayout={onLayout} className="self-start py-1.5 pl-3 pr-6" accessible accessibilityLabel={label}>
      {w > 0 && (
        <Svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
          <Path
            d={`M1.5 1.5 H${w - 1.5} L${w - 11} ${h / 2} L${w - 1.5} ${h - 1.5} H1.5 Z`}
            fill={RIBBON}
            stroke={ink}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </Svg>
      )}
      <Text className="text-[10.5px] font-bold uppercase tracking-[1.4px]" style={{ color: BLACK }}>
        {label}
      </Text>
    </View>
  );
}
