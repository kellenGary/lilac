import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Keyboard, Platform, Pressable, ScrollView, Text, TextInput, View, type TextStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatLong } from '@/lib/dates';
import { Button, LoadingBlock, LoadingScreen, Reveal, RibbonTag, Wordmark } from '@/shared-components';
import { saveErrorMessage } from '@/services/api';
import { useEntries } from '@/state/entries';
import { useColors } from '@/state/theme';
import { CheckIn } from './CheckIn';
import { PROMPTS } from './prompts';

// Borderless editor: remove the browser's focus ring on web.
const noOutline = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as unknown as TextStyle;

/** One line of the editor (leading-8). The page only starts following the caret once there are two. */
const LINE = 32;
/** Room kept between the line being typed and the bottom edge of what is visible. */
const BREATHING_ROOM = 16;
/** The word-count row under the editor, which the keyboard also covers. */
const FOOTER = 40;

export function WritePage() {
  const router = useRouter();
  const { purple, ink } = useColors();
  const { status, entries, today, getEntry, addEntry } = useEntries();
  const [text, setText] = useState('');
  const [promptIndex, setPromptIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feeling, setFeeling] = useState<number | null>(null);
  const insets = useSafeAreaInsets();
  const viewportHeight = useRef(0);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const caretEnd = useRef(0);
  // Native only: where the page is scrolled to, where the editor starts, how tall its text is, and the keyboard.
  const scrollY = useRef(0);
  const inputTop = useRef(0);
  const textHeight = useRef(0);
  const keyboardHeight = useRef(0);

  /*
   * The page is exactly one screen tall while the entry is a single line (the editor stretches to fill what is left),
   * so nothing scrolls and the date stays in view. From the second line on, scroll just enough to keep the line being
   * typed visible. Both platforms follow that rule; they only differ in how they measure.
   */

  // Web: size the textarea to its text, and follow the caret from line two.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = inputRef.current as unknown as HTMLTextAreaElement | null;
    const node = (scrollRef.current as unknown as { getScrollableNode?: () => HTMLElement } | null)?.getScrollableNode?.();
    if (!el) return;
    // Measure the text on its own (the box itself stretches to fill the page), then let it grow to at least that.
    // Collapsing the box shrinks the page for an instant, which would clamp the scroll position, so put it back.
    const top = node?.scrollTop ?? 0;
    el.style.height = '0px';
    const contentHeight = el.scrollHeight;
    el.style.height = `${contentHeight}px`;
    if (node) node.scrollTop = top;

    if (contentHeight < LINE * 1.5) return; // first line: the page already fits, never scroll for it
    // Editing in the middle: the browser keeps the caret in view. (Read it from the textarea itself: the
    // onSelectionChange event doesn't fire reliably on web while typing.)
    if (el.selectionEnd < el.value.length - 1) return;
    requestAnimationFrame(() => {
      if (!node) return;
      const vv = window.visualViewport; // on a phone the keyboard shrinks this, not the window
      const visibleBottom = Math.min(
        node.getBoundingClientRect().bottom,
        vv ? vv.offsetTop + vv.height : window.innerHeight,
      );
      const caretBottom = el.getBoundingClientRect().top + contentHeight + BREATHING_ROOM;
      if (caretBottom > visibleBottom) node.scrollBy({ top: caretBottom - visibleBottom });
    });
  }, [text]);

  // Web: focus without letting the browser scroll the editor into view (that is what pushed the date off screen).
  useEffect(() => {
    if (Platform.OS !== 'web' || status !== 'ready') return;
    (inputRef.current as unknown as HTMLTextAreaElement | null)?.focus({ preventScroll: true });
  }, [status]);

  // Phones: scroll just enough to keep the end of the text above the keyboard, from the second line on.
  const followCaret = () => {
    if (Platform.OS === 'web') return;
    if (textHeight.current < LINE * 1.5) return;
    if (caretEnd.current < text.length - 1) return;
    // iOS lays the keyboard over the bottom of the screen; Android resizes the window, so nothing is covered.
    const covered = Platform.OS === 'ios' ? Math.max(0, keyboardHeight.current - FOOTER - insets.bottom) : 0;
    const visibleBottom = scrollY.current + viewportHeight.current - covered;
    const caretBottom = inputTop.current + textHeight.current + BREATHING_ROOM;
    if (caretBottom > visibleBottom) {
      scrollRef.current?.scrollTo({ y: scrollY.current + (caretBottom - visibleBottom), animated: false });
    }
  };
  const followRef = useRef(followCaret);
  useEffect(() => {
    followRef.current = followCaret;
  });

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const set = (h: number) => {
      keyboardHeight.current = h;
      followRef.current();
    };
    const subs = [
      Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) =>
        set(e.endCoordinates.height),
      ),
      Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => set(0)),
    ];
    return () => subs.forEach((sub) => sub.remove());
  }, []);

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
      <SafeAreaView style={{ flex: 1 }}>
        <View className="h-[60px] flex-row items-center justify-between px-5 lg:px-8">
          <Wordmark />
          <View className="flex-row items-center gap-5">
            <Pressable accessibilityRole="button" onPress={close} className="min-h-11 justify-center">
              <Text className="text-sm font-medium text-purple">Close</Text>
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
          // Fill the screen: a one-line entry is exactly one screen tall, so it doesn't scroll at all.
          contentContainerStyle={{ flexGrow: 1 }}
          scrollEventThrottle={16}
          onScroll={(e) => {
            scrollY.current = e.nativeEvent.contentOffset.y;
          }}
          onLayout={(e) => {
            viewportHeight.current = e.nativeEvent.layout.height;
          }}
        >
          <View className="w-full max-w-[680px] grow gap-3.5 self-center px-5 pb-6 pt-10 sm:pt-16 lg:px-8 lg:pt-24">
            {firstEntry && (
              <Reveal delay={500}>
                <Text className="mb-1 text-xs font-semibold uppercase tracking-widest text-purple">
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
            <RibbonTag label="Today's prompt" />
            <View className="flex-row items-start justify-between gap-2.5">
              <Text className="flex-1 text-xl leading-7 text-purple">{PROMPTS[promptIndex]}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="New prompt"
                onPress={() => setPromptIndex((i) => (i + 1) % PROMPTS.length)}
                className="h-11 w-11 items-center justify-center rounded-full border border-line hover:opacity-70"
              >
                <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
                  <Path d="M20 12a8 8 0 1 1-2.6-5.9M19 3v5h-5" stroke={ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </Pressable>
            </View>
            {firstEntry && (
              <Reveal delay={900}>
                <Text className="max-w-[52ch] text-base leading-6 text-purple">
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
              autoFocus={Platform.OS !== 'web'}
              multiline
              value={text}
              onChangeText={setText}
              placeholder="Start writing…"
              placeholderTextColor={`${purple}88`}
              accessibilityLabel="Today's entry"
              onSelectionChange={(e) => {
                caretEnd.current = e.nativeEvent.selection.end;
              }}
              onLayout={(e) => {
                inputTop.current = e.nativeEvent.layout.y;
              }}
              onContentSizeChange={(e) => {
                textHeight.current = e.nativeEvent.contentSize.height;
                followCaret();
              }}
              scrollEnabled={false}
              // Stretches to fill the screen under a short entry, and grows past it as the text does.
              className="mt-6 min-h-[32px] shrink-0 grow text-[19px] leading-8 text-ink"
              style={[{ textAlignVertical: 'top' }, noOutline]}
            />
          </View>
        </ScrollView>

        <View className="min-h-10 flex-row items-center justify-between gap-4 px-5 lg:px-8">
          <Text accessibilityRole="alert" className="flex-1 text-xs text-roseInk">
            {error}
          </Text>
          <Text className="text-[13px] font-semibold text-purple">
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
