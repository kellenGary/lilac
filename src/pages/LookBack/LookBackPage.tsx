import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { fromKey } from '@/lib/dates';
import { brightSpots, onThisDay, weekRecap } from '@/lib/lookback';
import { Column, Container, LOOK_BACK, LoadingScreen, PageHeader, Reveal, Screen, SketchArt } from '@/shared-components';
import { useEntries } from '@/state/entries';
import { useLetters } from '@/state/letters';
import { BrightSpots } from './components/BrightSpots';
import { LettersSection } from './components/LettersSection';
import { OnThisDay } from './components/OnThisDay';
import { Section } from './components/Section';
import { WeekRecap } from './components/WeekRecap';

/**
 * A recap of the week, memories, the lines that mattered, and letters to your future self. Themes sit one tap away.
 * (What seems to help, and experiments, live on the To do page.)
 */
export function LookBackPage() {
  const router = useRouter();
  const { status, entries, today } = useEntries();
  const recap = useMemo(() => weekRecap(entries, today), [entries, today]);
  const memories = useMemo(() => onThisDay(entries, today), [entries, today]);
  const spots = useMemo(() => brightSpots(entries, 5), [entries]);
  const letters = useLetters();
  if (status !== 'ready') return <LoadingScreen />;

  const isSunday = fromKey(today).getDay() === 0;

  return (
    <Screen inTabs>
      <Container>
        <PageHeader />
        <Column className="pb-16">
          <SketchArt drawing={LOOK_BACK} />
          <View className="flex-row items-center justify-between gap-3">
            <Text accessibilityRole="header" className="text-[30px] font-semibold tracking-tight text-ink">
              Look back
            </Text>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Explore your themes"
              onPress={() => router.push('/themes')}
              className="py-2 hover:opacity-70"
            >
              <Text className="text-sm font-medium text-purple">Themes ›</Text>
            </Pressable>
          </View>

          {entries.length === 0 ? (
            <Text className="mt-10 max-w-[52ch] text-base leading-6 text-muted">
              Write your first entry and this page fills in: a recap of your week, entries from days gone by, and lines
              from your own writing worth keeping.
            </Text>
          ) : (
            <>
              <Reveal style={{ marginTop: 20 }}>
                <WeekRecap recap={recap} isSunday={isSunday} />
              </Reveal>

              <Section title="On this day" tip="Entries from a week, a month and a year ago.">
                <OnThisDay memories={memories} />
              </Section>

              <Section title="Bright spots" tip="Lines from your entries about what mattered to you.">
                <BrightSpots spots={spots} />
              </Section>

              <Section title="Letters to future you" tip="Write now, open later. A note to yourself, sealed until the day you choose.">
                <LettersSection letters={letters.letters} loading={letters.status === 'loading'} />
              </Section>
            </>
          )}
        </Column>
      </Container>
    </Screen>
  );
}
