import { useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { formatLong } from '@/lib/dates';
import { feelingOf } from '@/lib/orbs';
import { themeLabel } from '@/lib/themes';
import type { Entry } from '@/lib/types';
import { Face } from '@/shared-components/Face';
import { useColors } from '@/state/theme';

/** The entries behind one orb. Tapping one closes the sheet and opens it. */
export function ThemeSheet({ theme, entries, onClose }: { theme: string | null; entries: Entry[]; onClose: () => void }) {
  const router = useRouter();
  const { cream } = useColors();
  return (
    <Modal visible={theme !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: cream }}>
        <View className="flex-row items-center justify-between px-5 pb-2 pt-5">
          <View>
            <Text accessibilityRole="header" className="text-2xl font-bold text-ink">
              {theme ? themeLabel(theme) : ''}
            </Text>
            <Text className="text-sm text-muted">
              {entries.length} {entries.length === 1 ? 'day' : 'days'} in view
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onClose} className="min-h-11 justify-center px-2">
            <Text className="text-base font-medium text-ink">Done</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          {entries.map((e) => (
            <Pressable
              key={e.date}
              accessibilityRole="link"
              onPress={() => {
                onClose();
                router.push({ pathname: '/entry/[date]', params: { date: e.date } });
              }}
              className="flex-row gap-3 border-t border-line py-4"
            >
              <Face level={feelingOf(e)} size={28} />
              <View className="flex-1 gap-1">
                <Text className="text-sm font-semibold text-ink">{formatLong(e.date)}</Text>
                <Text numberOfLines={3} className="text-base leading-6 text-ink opacity-65">
                  {e.text.replace(/\n+/g, ' ')}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}
