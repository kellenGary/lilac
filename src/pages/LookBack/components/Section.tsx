import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { InfoHeading } from '@/shared-components/InfoTip';

/**
 * A titled block. The explanation is either a line under the title (`hint`) or tucked behind a small "i" beside it
 * (`tip`), for pages that would rather keep the words for what matters.
 */
export function Section({
  title,
  hint,
  tip,
  children,
}: {
  title: string;
  hint?: string;
  tip?: string;
  children: ReactNode;
}) {
  const heading = (
    <Text accessibilityRole="header" className="text-xl font-semibold text-ink">
      {title}
    </Text>
  );
  return (
    <View className="mt-10">
      {tip ? (
        <InfoHeading label={`About ${title.toLowerCase()}`} note={tip}>
          {heading}
        </InfoHeading>
      ) : (
        heading
      )}
      {hint && !tip && <Text className="mt-1 max-w-[56ch] text-sm leading-5 text-muted">{hint}</Text>}
      <View className="mt-4">{children}</View>
    </View>
  );
}
