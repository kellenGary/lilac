import { Pressable, Text, View } from 'react-native';

type SegmentedProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Stretch across the available width as one pill-shaped control (used where it has a row to itself). */
  fill?: boolean;
};

export function Segmented<T extends string>({ options, value, onChange, fill }: SegmentedProps<T>) {
  return (
    <View className={fill ? 'flex-row gap-1 rounded-full bg-track p-1' : 'flex-row flex-wrap gap-0.5'} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            className={`rounded-full px-3 py-1.5 ${fill ? 'flex-1 items-center py-2' : ''} ${active ? 'bg-ink' : ''}`}
          >
            <Text className={`${fill ? 'text-[13px]' : 'text-xs'} font-semibold ${active ? 'text-cream' : 'text-muted'}`}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
