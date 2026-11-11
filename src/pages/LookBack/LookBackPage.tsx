import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { fromKey } from '@/lib/dates';
import { brightSpots, onThisDay, weekRecap } from '@/lib/lookback';
import { Column, Container, LoadingScreen, PageHeader, Reveal, Screen } from '@/shared-components';
import { useEntries } from '@/state/entries';
import { BrightSpots } from './components/BrightSpots';
import { FeelingCalendar } from './components/FeelingCalendar';
import { OnThisDay } from './components/OnThisDay';
import { Section } from './components/Section';
import { WeekRecap } from './components/WeekRecap';

/** Your days at a glance, a recap of the week, memories, and the lines that mattered. Themes sit one tap away. */
export function LookBackPage() {
  const router = useRouter();
  const { status, entries, today } = useEntries();
  const recap = useMemo(() => weekRecap(entries, today), [entries, today]);
  const memories = useMemo(() => onThisDay(entries, today), [entries, today]);
  const spots = useMemo(() => brightSpots(entries, 5), [entries]);
  if (status !== 'ready') return <LoadingScreen />;

  const isSunday = fromKey(today).getDay() === 0;

  return (
    <Screen inTabs>
      <Container>
        <PageHeader />
        <Column className="pb-16">
          <Text accessibilityRole="header" className="text-4xl font-bold tracking-normal text-ink">
            Look back
          </Text>
          <Text className="mt-2 max-w-[56ch] text-base leading-6 text-muted">
            Your days at a glance, and the words that stood out.
          </Text>

          {entries.length === 0 ? (
            <Text className="mt-10 max-w-[52ch] text-base leading-6 text-muted">
              Write your first entry and this page fills in: a calendar of how your days felt, a recap of your week,
              and lines from your own writing worth keeping.
            </Text>
          ) : (
            <>
              <Reveal style={{ marginTop: 28 }}>
                <WeekRecap recap={recap} isSunday={isSunday} />
              </Reveal>

              <Section title="Your days" hint="Each square is a day, colored by how it felt. Tap one to open it.">
                <FeelingCalendar entries={entries} today={today} />
              </Section>

              <Section title="On this day" hint="Entries from a week, a month and a year ago.">
                <OnThisDay memories={memories} />
              </Section>

              <Section title="Bright spots" hint="Lines from your entries about what mattered to you.">
                <BrightSpots spots={spots} />
              </Section>

              <View className="mt-10">
                <Pressable
                  accessibilityRole="link"
                  onPress={() => router.push('/themes')}
                  className="flex-row items-center justify-between rounded-3xl border border-line px-6 py-5 hover:opacity-70"
                >
                  <View className="flex-1 pr-4">
                    <Text className="text-base font-semibold text-ink">Explore your themes</Text>
                    <Text className="mt-0.5 text-sm text-muted">See what you write about, as glowing orbs.</Text>
                  </View>
                  <Text className="text-2xl text-muted">›</Text>
                </Pressable>
              </View>
            </>
          )}
        </Column>
      </Container>
    </Screen>
  );
}
