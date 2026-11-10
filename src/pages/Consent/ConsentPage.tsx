import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NOT_MEDICAL } from '@/lib/legal';
import { BloomBackground, Button, Reveal, Wordmark } from '@/shared-components';
import { useAuth } from '@/state/auth';
import { useConsent } from '@/state/consent';
import { useColors } from '@/state/theme';

const POINTS = [
  {
    title: 'Your words are read by a model',
    body: 'To score an entry and find its themes, the text is sent to TypeSafe, a third party whose AI model reads it. Only the text is sent: not your name or email.',
  },
  {
    title: 'Encrypted before it is stored',
    body: 'Your entries are encrypted by our server before they reach the database, and are shown only to you.',
  },
  {
    title: 'You stay in control',
    body: 'You can download everything or delete your account and every entry at any time from Settings.',
  },
];

/** Shown once, before the first entry is scored: says plainly who reads the text, and what the app is not. */
export function ConsentPage() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { accept } = useConsent();
  const { shadow } = useColors();

  return (
    <View className="flex-1 bg-cream">
      <BloomBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full max-w-[560px] px-5 py-10">
            <Wordmark />
            <Reveal delay={150} style={{ marginTop: 32 }}>
              <Text
                accessibilityRole="header"
                className="text-[32px] font-bold leading-9 tracking-normal text-ink sm:text-[40px] sm:leading-[44px]"
              >
                Before you begin
              </Text>
              <Text className="mt-3 text-lg leading-7 text-body">
                Lilac Pages works by reading what you write. Here is what that means.
              </Text>
            </Reveal>

            <Reveal delay={350} style={{ marginTop: 24 }}>
              <View
                className="gap-5 rounded-3xl bg-surface p-6"
                style={{
                  shadowColor: shadow,
                  shadowOpacity: 0.08,
                  shadowRadius: 24,
                  shadowOffset: { width: 0, height: 8 },
                }}
              >
                {POINTS.map((p) => (
                  <View key={p.title} className="gap-1">
                    <Text className="text-[15px] font-semibold text-ink">{p.title}</Text>
                    <Text className="text-[15px] leading-[22px] text-body">{p.body}</Text>
                  </View>
                ))}
                <View className="border-t border-line pt-4">
                  <Text className="text-[13px] leading-5 text-muted">{NOT_MEDICAL}</Text>
                </View>
              </View>
            </Reveal>

            <Reveal delay={550} style={{ marginTop: 24 }}>
              <View className="flex-row flex-wrap items-center gap-3">
                <Button size="lg" label="I agree, continue" onPress={accept} />
                <Button variant="ghost" label="Not now" onPress={signOut} />
              </View>
              <Text
                accessibilityRole="link"
                onPress={() => router.push('/privacy')}
                className="mt-5 text-sm text-muted underline"
              >
                Read the privacy policy
              </Text>
            </Reveal>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
