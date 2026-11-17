import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { formatLong, formatShort } from '@/lib/dates';
import type { Letter } from '@/lib/types';

/** Letters to your future self: ones ready to read, sealed ones, and ones already read. */
export function LettersSection({ letters, loading }: { letters: Letter[]; loading: boolean }) {
  const router = useRouter();
  const open = (id: string) => router.push({ pathname: '/letter/[id]', params: { id } });
  const ready = letters.filter((l) => !l.locked && !l.opened);
  const sealed = letters.filter((l) => l.locked).sort((a, b) => (a.unlockOn < b.unlockOn ? -1 : 1));
  const read = letters.filter((l) => !l.locked && l.opened);

  return (
    <View className="gap-3">
      {ready.map((l) => (
        <Pressable
          key={l.id}
          accessibilityRole="link"
          onPress={() => open(l.id)}
          className="gap-1 rounded-3xl bg-sun p-5 hover:opacity-85"
        >
          <Text className="text-xs font-semibold uppercase tracking-widest text-body">Ready to read</Text>
          <Text className="text-lg font-semibold text-ink">A letter from {formatShort(l.writtenOn)}</Text>
          <Text className="text-sm text-body">Past you wrote this for today.</Text>
        </Pressable>
      ))}

      {sealed.map((l) => (
        <Pressable
          key={l.id}
          accessibilityRole="link"
          onPress={() => open(l.id)}
          className="flex-row items-center gap-3 rounded-3xl bg-surface p-5 hover:opacity-85"
        >
          <Text className="text-xl">✉️</Text>
          <View className="flex-1">
            <Text className="text-base font-semibold text-ink">Sealed until {formatLong(l.unlockOn)}</Text>
            <Text className="text-xs text-muted">Written {formatShort(l.writtenOn)}</Text>
          </View>
        </Pressable>
      ))}

      {read.map((l) => (
        <Pressable
          key={l.id}
          accessibilityRole="link"
          onPress={() => open(l.id)}
          className="rounded-3xl border border-line p-5 hover:opacity-70"
        >
          <Text className="text-base text-ink">Letter from {formatShort(l.writtenOn)}</Text>
          <Text className="text-xs text-muted">Opened {formatShort(l.unlockOn)} or after</Text>
        </Pressable>
      ))}

      {letters.length === 0 ? (
        <View className="flex-row items-center justify-between border-t border-line pt-3.5">
          <Text className="text-base text-muted">{loading ? '' : 'No letters yet'}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/letter/new')}
            className="rounded-full border border-ink px-4 py-2 hover:opacity-70"
          >
            <Text className="text-[13px] font-semibold text-ink">Write one</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/letter/new')}
          className="self-start rounded-full border border-ink px-4 py-2 hover:opacity-70"
        >
          <Text className="text-[13px] font-semibold text-ink">Write a letter</Text>
        </Pressable>
      )}
    </View>
  );
}
