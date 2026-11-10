import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Platform, Text, View, type ViewStyle } from 'react-native';

import { useIsWide } from '@/lib/breakpoints';
import { weekStartKey } from '@/lib/dates';
import { plantStateForWeek } from '@/lib/plant';
import { Button, Container, PageHeader, Reveal, Screen, Wordmark, LoadingBlock } from '@/shared-components';
import { useAuth } from '@/state/auth';
import { useEntries } from '@/state/entries';
import { Feed, type FeedGroup } from './components/Feed';
import { MobileInsights, Sidebar, SidebarActions } from './components/Sidebar';

const introSent = new Set<string>();

// position: sticky is web-only; react-native-web passes it through.
const sticky = (Platform.OS === 'web' ? { position: 'sticky', top: 24 } : undefined) as unknown as
  ViewStyle | undefined;

export function HomePage() {
  const { status, errorKind, reload, entries, today } = useEntries();
  const { session, signOut } = useAuth();
  const router = useRouter();
  const isWide = useIsWide();
  const userId = session?.user.id;
  const isNewUser = status === 'ready' && entries.length === 0;

  // A brand-new user starts by writing today's entry. Once per user per app load, so Close still reaches Home.
  useEffect(() => {
    if (!isNewUser || !userId || introSent.has(userId)) return;
    introSent.add(userId);
    router.replace('/write');
  }, [isNewUser, userId, router]);

  const groups = useMemo<FeedGroup[]>(() => {
    const map = new Map<string, FeedGroup>();
    for (const entry of entries) {
      const weekStart = weekStartKey(entry.date);
      if (!map.has(weekStart))
        map.set(weekStart, {
          weekStart,
          entries: [],
          current: weekStart === weekStartKey(today),
          plant: plantStateForWeek(entries, weekStart),
        });
      map.get(weekStart)!.entries.push(entry);
    }
    return [...map.values()];
  }, [entries, today]);

  if (status !== 'ready') {
    return (
      <Screen inTabs>
        <Container>
          <View className="h-[60px] justify-center">
            <Wordmark />
          </View>
          <View className="items-center gap-4 pt-24">
            {status === 'error' ? (
              <>
                <Text className="max-w-[420px] text-center text-base leading-6 text-body">
                  {errorKind === 'network'
                    ? "We can't reach the Lilac Pages server."
                    : errorKind === 'auth'
                      ? 'Your session has expired. Please sign in again.'
                      : "We couldn't load your journal."}
                </Text>
                {errorKind === 'network' && __DEV__ && (
                  <Text className="max-w-[420px] text-center text-sm leading-5 text-muted">
                    Is it running? Start it with &quot;npm run dev&quot; in the server folder.
                  </Text>
                )}
                {errorKind === 'auth' ? (
                  <Button label="Sign out" onPress={signOut} />
                ) : (
                  <Button label="Try again" onPress={reload} />
                )}
              </>
            ) : (
              <LoadingBlock message="Loading your journal…" />
            )}
          </View>
        </Container>
      </Screen>
    );
  }

  return (
    <Screen inTabs>
      <Container>
        <PageHeader />
        {isWide ? (
          <View className="flex-row items-start gap-[72px]">
            <View className="w-full max-w-[680px] flex-1">
              <Feed groups={groups} />
            </View>
            <View className="w-[340px]" style={sticky}>
              <Reveal delay={100}>
                <Sidebar />
              </Reveal>
            </View>
          </View>
        ) : (
          // Phones and tablets: write button and streak, then a compact plant and trend card, then the journal.
          <View className="items-center gap-8">
            <View className="w-full max-w-[680px]">
              <Reveal delay={100}>
                <SidebarActions />
              </Reveal>
            </View>
            <View className="w-full max-w-[680px]">
              <Reveal delay={200}>
                <MobileInsights />
              </Reveal>
            </View>
            <View className="w-full max-w-[680px]">
              <Feed groups={groups} />
            </View>
          </View>
        )}
      </Container>
    </Screen>
  );
}
