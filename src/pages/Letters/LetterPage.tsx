import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { formatLong } from '@/lib/dates';
import { Button, Column, Container, LoadingScreen, PageHeader, Screen } from '@/shared-components';
import { useLetters } from '@/state/letters';

/** One letter: sealed until its day, then it reads back. */
export function LetterPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { status, letters, remove, markOpened } = useLetters();
  const letter = letters.find((l) => l.id === id);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const marked = useRef(false);

  // Reading it for the first time takes it off the "ready to read" list.
  useEffect(() => {
    if (!letter || letter.locked || letter.opened || marked.current) return;
    marked.current = true;
    markOpened(letter.id).catch(() => {});
  }, [letter, markOpened]);

  if (status === 'loading') return <LoadingScreen />;

  const back = () => (router.canGoBack() ? router.back() : router.replace('/look-back'));
  const del = async () => {
    if (!letter || busy) return;
    setBusy(true);
    try {
      await remove(letter.id);
      back();
    } catch {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Container>
        <PageHeader back />
        <Column className="pb-16">
          {!letter ? (
            <Text className="mt-10 text-base text-muted">This letter could not be found.</Text>
          ) : letter.locked ? (
            <>
              <Text className="text-5xl">✉️</Text>
              <Text accessibilityRole="header" className="mt-4 text-4xl font-bold tracking-normal text-ink">
                Still sealed
              </Text>
              <Text className="mt-3 max-w-[52ch] text-lg leading-7 text-body">
                You wrote this on {formatLong(letter.writtenOn)}. It opens on {formatLong(letter.unlockOn)}.
              </Text>
              <Text className="mt-2 max-w-[52ch] text-base leading-6 text-muted">
                Nobody can read it before then, not even you.
              </Text>
            </>
          ) : (
            <>
              <Text className="text-xs font-semibold uppercase tracking-widest text-muted">
                A letter from {formatLong(letter.writtenOn)}
              </Text>
              <Text accessibilityRole="header" className="mt-2 text-3xl font-bold tracking-normal text-ink">
                From past you
              </Text>
              <Text className="mt-6 max-w-[60ch] text-[19px] leading-8 text-ink">{letter.text}</Text>
              <View className="mt-10 gap-3 rounded-3xl bg-sun p-6">
                <Text className="text-base leading-6 text-ink">
                  How does it sit with you now? Writing today&apos;s entry is a good way to see how far you have come.
                </Text>
                <View className="flex-row">
                  <Button label="Write today's entry" onPress={() => router.push('/write')} />
                </View>
              </View>
            </>
          )}

          {letter && (
            <View className="mt-10">
              <Pressable
                accessibilityRole="button"
                onPress={() => (confirming ? del() : setConfirming(true))}
                disabled={busy}
                className="self-start py-2 hover:opacity-70"
              >
                <Text className={`text-sm underline ${confirming ? 'font-semibold text-roseInk' : 'text-muted'}`}>
                  {confirming ? 'Tap again to delete this letter for good' : 'Delete this letter'}
                </Text>
              </Pressable>
            </View>
          )}
        </Column>
      </Container>
    </Screen>
  );
}
