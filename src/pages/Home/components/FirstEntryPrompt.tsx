import { Text, View } from 'react-native';

import { Button, Reveal } from '@/shared-components';
import { useTransition } from '@/state/transition';

/** What a brand-new user sees in place of the feed. */
export function FirstEntryPrompt() {
  const { go } = useTransition();
  return (
    <Reveal delay={150}>
      <View className="max-w-[560px] gap-4 border-t border-line pt-6">
        <Text accessibilityRole="header" className="text-2xl font-bold tracking-tight text-ink">
          Welcome to Lilac Pages
        </Text>
        <Text className="text-base leading-6 text-body">
          Your journal is empty, which is a good place to start. Write a few lines about today, however it went.
        </Text>
        <Text className="text-base leading-6 text-muted">
          After each entry you will see how it read. Over time a trend and a plant grow from what you write, and the
          entries stack up here.
        </Text>
        <View className="mt-2 flex-row">
          <Button
            size="lg"
            label="Write your first entry"
            onPress={(e) =>
              go(
                '/write',
                Number.isFinite(e.nativeEvent.pageX) ? { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY } : undefined,
              )
            }
          />
        </View>
      </View>
    </Reveal>
  );
}
