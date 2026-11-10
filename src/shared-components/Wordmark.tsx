import { Link } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { FaceMark } from './FaceMark';

export function Wordmark() {
  return (
    <Link href="/" asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Lilac Pages home"
        className="flex-row items-center hover:opacity-70"
      >
        <FaceMark size={24} />
        <Text className="text-[19px] font-bold tracking-wide text-ink">Lilac Pages</Text>
      </Pressable>
    </Link>
  );
}
