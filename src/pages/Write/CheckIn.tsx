import { Pressable, Text, View } from 'react-native';

import { FEELINGS } from '@/lib/feeling';
import { Face } from '@/shared-components';

/** Optional one-tap "how are you feeling?" above the page. Tap the chosen face again to clear it. */
export function CheckIn({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const chosen = FEELINGS.find((f) => f.level === value);
  return (
    <View className="gap-1.5">
      <Text className="text-[13px] font-semibold text-purple">
        {chosen ? `Feeling ${chosen.label.toLowerCase()}` : 'How are you feeling? (optional)'}
      </Text>
      <View className="-ml-1.5 flex-row">
        {FEELINGS.map((f) => (
          <Pressable
            key={f.level}
            accessibilityRole="button"
            accessibilityLabel={f.label}
            accessibilityState={{ selected: value === f.level }}
            onPress={() => onChange(value === f.level ? null : f.level)}
            className={`h-11 w-11 items-center justify-center hover:opacity-100 ${value !== null && value !== f.level ? 'opacity-50' : ''}`}
          >
            <Face level={f.level} size={36} selected={value === f.level} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
