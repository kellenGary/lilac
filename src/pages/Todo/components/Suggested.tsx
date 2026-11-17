import { Pressable, Text, View } from 'react-native';

import type { Suggestion } from '@/lib/tasks';

/** Things that came up on your lighter days, as habits you could start. One tap adds one. */
export function Suggested({ items, onAdd }: { items: Suggestion[]; onAdd: (s: Suggestion) => void }) {
  return (
    <View className="gap-2.5">
      {items.map((s) => (
        <View key={s.theme} className="flex-row items-center gap-3 rounded-[18px] border border-line bg-surface px-4 py-3.5">
          <View className="flex-1">
            <Text className="text-[15px] font-semibold text-ink">{s.title}</Text>
            <Text className="mt-0.5 text-[12.5px] leading-[17px] text-purple">
              Lighter days · {s.days}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add ${s.title}`}
            onPress={() => onAdd(s)}
            className="rounded-full border border-ink px-3.5 py-1.5 hover:opacity-70"
          >
            <Text className="text-[13px] font-semibold text-ink">Add</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
