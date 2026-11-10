import { useRouter } from 'expo-router';
import { Linking, Text, View } from 'react-native';

import { CONTACT_EMAIL, NOT_MEDICAL } from '@/lib/legal';
import { useAuth } from '@/state/auth';
import { useConsent } from '@/state/consent';
import { Button, Column, Container, Screen, Wordmark } from '@/shared-components';

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: 'Download your entries',
    body: ['Open Settings > Your data > Download my data. You get everything you have written in one file.'],
  },
  {
    title: 'Delete your account',
    body: [
      'Open Settings > Danger zone > Delete my account. This permanently removes your entries and your sign-in, and it cannot be undone. Download your data first if you want to keep it.',
    ],
  },
  {
    title: 'The app is slow or says it cannot reach the server',
    body: ['Check your connection and try again in a minute. If it keeps happening, write to us below.'],
  },
  {
    title: 'If you are in crisis',
    body: [NOT_MEDICAL, 'Nobody reads your entries, so we cannot respond to an emergency. Please contact 988 or a local service.'],
  },
];

/** Public (no sign-in needed): this is the App Store "Support URL". */
export function SupportPage() {
  const router = useRouter();
  const { session } = useAuth();
  const { accepted } = useConsent();
  const leave = () => router.replace(!session ? '/sign-in' : accepted ? '/settings' : '/consent');
  return (
    <Screen>
      <Container>
        <View className="h-[60px] flex-row items-center justify-between">
          <Wordmark />
          <Button variant="ghost" label="Back" onPress={leave} />
        </View>
        <Column className="pb-16 pt-6">
          <Text accessibilityRole="header" className="text-4xl font-bold tracking-normal text-ink">
            Support
          </Text>
          <Text className="mt-3 max-w-[60ch] text-base leading-6 text-body">
            Help with Lilac Pages, a journal that gives your entries back as gentle scores and themes.
          </Text>
          {CONTACT_EMAIL !== '' && (
            <View className="mt-8 gap-3">
              <Text accessibilityRole="header" className="text-xl font-semibold text-ink">
                Contact us
              </Text>
              <Text className="max-w-[60ch] text-base leading-6 text-body">
                Questions, bugs or feedback: write to {CONTACT_EMAIL} and we will reply as soon as we can.
              </Text>
              <View className="flex-row">
                <Button label="Email support" onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)} />
              </View>
            </View>
          )}
          {SECTIONS.map((s) => (
            <View key={s.title} className="mt-8 gap-3">
              <Text accessibilityRole="header" className="text-xl font-semibold text-ink">
                {s.title}
              </Text>
              {s.body.map((p) => (
                <Text key={p} className="max-w-[60ch] text-base leading-6 text-body">
                  {p}
                </Text>
              ))}
            </View>
          ))}
          <View className="mt-8 flex-row">
            <Button variant="ghost" label="Privacy policy" onPress={() => router.push('/privacy')} />
          </View>
        </Column>
      </Container>
    </Screen>
  );
}
