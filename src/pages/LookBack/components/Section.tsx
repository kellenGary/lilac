import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

/** A titled block on the Look back tab. */
export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View className="mt-10">
      <Text accessibilityRole="header" className="text-xl font-semibold text-ink">
        {title}
      </Text>
      {hint && <Text className="mt-1 max-w-[56ch] text-sm leading-5 text-muted">{hint}</Text>}
      <View className="mt-4">{children}</View>
    </View>
  );
}
