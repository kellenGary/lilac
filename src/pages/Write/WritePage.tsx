import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View, type TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatLong } from '@/lib/dates';
import { BloomBackground, Button, Reveal, Wordmark, LoadingScreen, LoadingBlock } from '@/shared-components';
import { saveErrorMessage } from '@/services/api';
import { useEntries } from '@/state/entries';
import { useColors } from '@/state/theme';
import { CheckIn } from './CheckIn';
import { PROMPTS } from './prompts';

// Borderless editor: remove the browser's focus ring on web.
const noOutline = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as unknown as TextStyle;

export function WritePage() {
  const router = useRouter();
  const { hint } = useColors();
  const { status, entries, today, getEntry, addEntry } = useEntries();
  const [text, setText] = useState('');
  const [promptIndex, setPromptIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feeling, setFeeling] = useState<number | null>(null);
  const viewportHeight = useRef(0);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const caretEnd = useRef(0);

  // Web: size the textarea to its text so the page itself is what scrolls (endlessly, no inner scrollbar).
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = inputRef.current as unknown as HTMLTextAreaElement | null;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
    // Keep the line being typed in view when writing at the end.
    if (caretEnd.current >= text.length - 1) {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false }));
    }
  }, [text]);

  // Phones: the input grows by itself. Only scroll once the writing has outgrown the screen, and only when the page
  // actually got taller. Scrolling on every keystroke (or setting the input's height from its measured size) made the
  // first few lines jump around while the keyboard was sliding up.
  const followCaret = (_width: number, contentHeight: number) => {
    if (Platform.OS === 'web') return;
    if (caretEnd.current < text.length - 1) return;
    if (contentHeight > viewportHeight.current) scrollRef.current?.scrollToEnd({ animated: false });
  };

  if (status !== 'ready') return <LoadingScreen />; // wait for entries so we know whether today is already written

  // One entry per day: if today is already written, go read it instead.
  // (Not while saving: adding the entry makes it exist, and we're about to go to /finish.)
  if (!saving && getEntry(today)) return <Redirect href={{ pathname: '/entry/[date]', params: { date: today } }} />;

  const firstEntry = entries.length === 0;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const finish = async () => {
    if (!words || saving) return;
    setSaving(true);
    setError(null);
    try {
      const entry = await addEntry(text.trim(), feeling);
      router.replace(
        entry.crisis
          ? { pathname: '/safety', params: { date: entry.date, then: 'finish' } }
          : { pathname: '/finish', params: { date: entry.date } },
      );
    } catch (e) {
      setError(saveErrorMessage(e));
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-cream">
      <BloomBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <View className="h-[60px] flex-row items-center justify-between px-5 lg:px-8">
          <Wordmark />
          <View className="flex-row items-center gap-5">
            <Pressable accessibilityRole="button" onPress={close} className="min-h-11 justify-center">
              <Text className="text-sm text-muted">Close</Text>
            </Pressable>
            <Button label={saving ? 'Scoring…' : 'Finish entry'} onPress={finish} disabled={!words || saving} />
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
          onLayout={(e) => {
            viewportHeight.current = e.nativeEvent.layout.height;
          }}
          onContentSizeChange={followCaret}
        >
          <View className="w-full max-w-[680px] gap-3.5 self-center px-5 pb-48 pt-10 sm:pt-16 lg:px-8 lg:pt-24">
            {firstEntry && (
              <Reveal delay={500}>
                <Text className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">
                  Welcome. Your first entry
                </Text>
              </Reveal>
            )}
            <Reveal delay={600}>
              <Text
                accessibilityRole="header"
                className="text-[32px] font-bold leading-9 tracking-normal text-ink sm:text-[42px] sm:leading-[46px]"
              >
                {formatLong(today)}
              </Text>
            </Reveal>
            <View className="flex-row items-center gap-2.5">
              <Text className="flex-shrink text-xl leading-7 text-muted">{PROMPTS[promptIndex]}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="New prompt"
                onPress={() => setPromptIndex((i) => (i + 1) % PROMPTS.length)}
                className="h-11 w-11 items-center justify-center"
              >
                <Text className="text-lg text-muted">↻</Text>
              </Pressable>
            </View>
            {firstEntry && (
              <Reveal delay={900}>
                <Text className="max-w-[52ch] text-base leading-6 text-body">
                  There is no right way to do this. Write a few lines about today, however it went. When you finish, you
                  will see how it read.
                </Text>
              </Reveal>
            )}
            <View className="mt-3">
              <CheckIn value={feeling} onChange={setFeeling} />
            </View>
            <TextInput
              ref={inputRef}
              autoFocus
              multiline
              value={text}
              onChangeText={setText}
              placeholder="Start writing…"
              placeholderTextColor={hint}
              accessibilityLabel="Today's entry"
              onSelectionChange={(e) => {
                caretEnd.current = e.nativeEvent.selection.end;
              }}
              scrollEnabled={false}
              className="mt-6 min-h-[360px] text-[19px] leading-8 text-ink"
              style={[{ textAlignVertical: 'top' }, noOutline]}
            />
          </View>
        </ScrollView>

        <View className="min-h-10 flex-row items-center justify-between gap-4 px-5 lg:px-8">
          <Text accessibilityRole="alert" className="flex-1 text-xs text-roseInk">
            {error}
          </Text>
          <Text className="text-xs text-muted">
            {words} {words === 1 ? 'word' : 'words'}
          </Text>
        </View>
      </SafeAreaView>
      {saving && (
        <View className="absolute bottom-0 left-0 right-0 top-0 items-center justify-center bg-cream/90">
          <LoadingBlock message="Reading what you wrote…" />
        </View>
      )}
    </View>
  );
}
