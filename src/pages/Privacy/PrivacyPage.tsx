import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { CONTACT_EMAIL, NOT_MEDICAL, POLICY_UPDATED } from '@/lib/legal';
import { useAuth } from '@/state/auth';
import { useConsent } from '@/state/consent';
import { Button, Column, Container, Screen, Wordmark } from '@/shared-components';

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: 'What we collect',
    body: [
      'Your email address and name, to run your account. The journal entries you write, and an optional "how are you feeling" check-in. The scores and themes derived from each entry.',
      'We do not collect your location, contacts, or advertising identifiers, and we do not run analytics or ad trackers.',
    ],
  },
  {
    title: 'How your entries are protected',
    body: [
      'Entry text, highlights, themes and check-ins are encrypted by our server with AES-256 before they are written to the database. They are decrypted only to show them back to you.',
      'Data travels over encrypted connections. Other users cannot read your entries.',
    ],
  },
  {
    title: 'Who else sees your writing',
    body: [
      'To score an entry, and to find its themes and the phrases behind each score, the text of the entry is sent to TypeSafe, a third-party AI service. Only the text is sent: not your name or email. It is used to return the scores and is not used to advertise to you.',
      'Our database and hosting providers (Supabase and Render) store and process your data on our behalf. They hold your entries only in encrypted form. We do not sell your data.',
    ],
  },
  {
    title: 'What the scores are, and are not',
    body: [NOT_MEDICAL],
  },
  {
    title: 'Your choices',
    body: [
      'You can download everything you have written, and delete your account, from Settings. Deleting your account permanently removes your entries and sign-in. It cannot be undone.',
    ],
  },
  {
    title: 'Children',
    body: ['Lilac Pages is not intended for children under 13, and we do not knowingly collect their data.'],
  },
  {
    title: 'Changes',
    body: ['If this policy changes in a way that affects your entries, we will ask for your agreement again.'],
  },
];

/** Public (no sign-in needed): App Store review and visitors can open /privacy directly. */
export function PrivacyPage() {
  const router = useRouter();
  const { session } = useAuth();
  const { accepted } = useConsent();
  // Go to a known screen rather than history: a reload or guard redirect can leave this page as its own previous entry.
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
            Privacy policy
          </Text>
          <Text className="mt-2 text-sm text-muted">Last updated {POLICY_UPDATED}</Text>
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
          {CONTACT_EMAIL !== '' && (
            <View className="mt-8 gap-3">
              <Text accessibilityRole="header" className="text-xl font-semibold text-ink">
                Contact
              </Text>
              <Text className="text-base leading-6 text-body">Questions about your data: {CONTACT_EMAIL}</Text>
            </View>
          )}
        </Column>
      </Container>
    </Screen>
  );
}
