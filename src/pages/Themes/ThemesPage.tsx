import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { addDays, formatShort, fromKey } from '@/lib/dates';
import { entriesInWindow } from '@/lib/orbs';
import { hasThemes, headlines, MIN_DAYS, themePatterns } from '@/lib/patterns';
import { api } from '@/services/api';
import { Button, Column, Container, PageHeader, Reveal, Screen, LoadingScreen } from '@/shared-components';
import { useEntries } from '@/state/entries';
import { OrbField } from './components/OrbField';
import { ThemeSheet } from './components/ThemeSheet';
import { TimeScrubber } from './components/TimeScrubber';

export function ThemesPage() {
  const { status, entries, today, reload } = useEntries();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [failed, setFailed] = useState(false);
  // How far back the time strip reaches: to the first entry, at least a month, at most two years.
  const weeks = useMemo(() => {
    const oldest = entries[entries.length - 1]?.date;
    if (!oldest) return 4;
    const days = Math.round((fromKey(today).getTime() - fromKey(oldest).getTime()) / 86_400_000);
    return Math.max(4, Math.min(104, Math.ceil(days / 7)));
  }, [entries, today]);
  if (status !== 'ready') return <LoadingScreen />;

  const tagged = hasThemes(entries);
  const patterns = themePatterns(entries);
  const lines = headlines(patterns);
  const end = addDays(today, -Math.min(offset, weeks) * 7);
  const selectedEntries = selected ? entriesInWindow(entries, end).filter((e) => e.themes.includes(selected)) : [];

  const analyse = async () => {
    setWorking(true);
    setFailed(false);
    try {
      for (;;) {
        const { more } = await api.refreshInsights();
        if (!more) break;
      }
      reload();
    } catch {
      setFailed(true);
    } finally {
      setWorking(false);
    }
  };

  return (
    <Screen>
      <Container>
        <PageHeader back />
        <Column className="pb-16">
          <Text accessibilityRole="header" className="text-4xl font-bold tracking-normal text-ink">
            Themes
          </Text>
          <Text className="mt-2 max-w-[56ch] text-base leading-6 text-muted">
            What you write about. Bigger glows are themes that came up more, and warmer colors are rougher days.
          </Text>

          {entries.length === 0 ? (
            <Text className="mt-10 text-base text-muted">Themes appear once you have written a few entries.</Text>
          ) : !tagged ? (
            <Reveal style={{ marginTop: 32 }}>
              <View className="gap-4 rounded-3xl bg-surface p-6">
                <Text className="text-base leading-6 text-body">
                  Your entries have not been read for themes yet. This takes a moment, and does not change any scores.
                </Text>
                {failed && <Text className="text-sm text-roseInk">That did not work. Please try again.</Text>}
                <View className="flex-row">
                  <Button
                    label={working ? 'Reading your entries…' : 'Find my patterns'}
                    onPress={analyse}
                    disabled={working}
                  />
                </View>
              </View>
            </Reveal>
          ) : (
            <>
              <View className="mt-6">
                <OrbField entries={entries} end={end} onSelect={setSelected} />
              </View>
              <View className="mt-2">
                <TimeScrubber
                  weeks={weeks}
                  offset={Math.min(offset, weeks)}
                  onChange={setOffset}
                  endLabel={offset === 0 ? 'Today' : formatShort(end)}
                />
              </View>

              {lines.length > 0 ? (
                <Reveal style={{ marginTop: 28 }}>
                  <View className="gap-3 rounded-3xl bg-sun p-6">
                    {lines.map((line) => (
                      <Text key={line} className="text-base leading-6 text-ink">
                        {line}
                      </Text>
                    ))}
                  </View>
                </Reveal>
              ) : (
                <Text className="mt-8 max-w-[52ch] text-[13px] leading-5 text-muted">
                  Written takeaways appear once a theme has at least {MIN_DAYS} days with it and {MIN_DAYS} without. Tap a
                  glow to read the entries behind it.
                </Text>
              )}
              <ThemeSheet theme={selected} entries={selectedEntries} onClose={() => setSelected(null)} />
            </>
          )}
        </Column>
      </Container>
    </Screen>
  );
}
