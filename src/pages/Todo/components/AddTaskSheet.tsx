import { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, TextInput, View, type TextStyle } from 'react-native';

import { SUGGESTABLE_THEMES } from '@/lib/tasks';
import { themeLabel } from '@/lib/themes';
import { Button } from '@/shared-components';
import { useColors } from '@/state/theme';

const noOutline = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as unknown as TextStyle;

/** Add something to the list: what it is, whether it repeats, and (optionally) what kind of thing it is. */
export function AddTaskSheet({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (title: string, kind: 'daily' | 'once', theme: string | null) => Promise<void>;
}) {
  const { cream, purple, line } = useColors();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<'daily' | 'once'>('daily');
  const [theme, setTheme] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setTitle('');
    setKind('daily');
    setTheme(null);
    setError(null);
    onClose();
  };
  const submit = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onAdd(title.trim(), kind, kind === 'daily' ? theme : null);
      close();
    } catch {
      setError("We couldn't add that. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const chip = (selected: boolean) =>
    `rounded-full border px-3.5 py-2 ${selected ? 'border-line bg-surface' : 'border-transparent'}`;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: cream }}>
        <View className="flex-row items-center justify-between px-5 pb-2 pt-5">
          <Text accessibilityRole="header" className="text-2xl font-semibold text-ink">
            Add something
          </Text>
          <Pressable accessibilityRole="button" onPress={close} className="min-h-11 justify-center px-2">
            <Text className="text-base font-medium text-ink">Cancel</Text>
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          <TextInput
            autoFocus
            value={title}
            onChangeText={setTitle}
            maxLength={120}
            placeholder="Walk outside for 15 minutes"
            placeholderTextColor={`${purple}88`}
            accessibilityLabel="What do you want to do?"
            returnKeyType="done"
            onSubmitEditing={submit}
            className="mt-3 rounded-2xl border bg-surface px-4 py-3.5 text-[17px] text-ink"
            style={[{ borderColor: line }, noOutline]}
          />

          <Text className="mb-2 mt-6 text-[13px] font-semibold text-purple">How often</Text>
          <View className="flex-row gap-1">
            {(
              [
                ['daily', 'Every day'],
                ['once', 'Just today'],
              ] as const
            ).map(([k, label]) => (
              <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: kind === k }} onPress={() => setKind(k)} className={chip(kind === k)}>
                <Text className={`text-[14px] font-medium ${kind === k ? 'text-ink' : 'text-muted'}`}>{label}</Text>
              </Pressable>
            ))}
          </View>

          {kind === 'daily' && (
            <>
              <Text className="mb-1 mt-6 text-[13px] font-semibold text-purple">What kind of thing is it? (optional)</Text>
              <Text className="mb-2 text-[12.5px] leading-[17px] text-muted">
                It helps group it and suggest more like it.
              </Text>
              <View className="flex-row flex-wrap gap-1">
                <Pressable accessibilityRole="button" onPress={() => setTheme(null)} className={chip(theme === null)}>
                  <Text className={`text-[14px] font-medium ${theme === null ? 'text-ink' : 'text-muted'}`}>None</Text>
                </Pressable>
                {SUGGESTABLE_THEMES.map((t) => (
                  <Pressable key={t} accessibilityRole="button" onPress={() => setTheme(t)} className={chip(theme === t)}>
                    <Text className={`text-[14px] font-medium ${theme === t ? 'text-ink' : 'text-muted'}`}>{themeLabel(t)}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {error && (
            <Text accessibilityRole="alert" className="mt-4 text-sm text-roseInk">
              {error}
            </Text>
          )}
          <View className="mt-8">
            <Button size="lg" className="w-full" label={busy ? 'Adding…' : 'Add'} onPress={submit} disabled={!title.trim() || busy} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
