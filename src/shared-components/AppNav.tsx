import { useRouter, usePathname } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

const ITEMS = [
  { label: 'Journal', href: '/' },
  { label: 'Look back', href: '/look-back' },
  { label: 'Garden', href: '/garden' },
  { label: 'Settings', href: '/settings' },
] as const;

/** Which section a path belongs to, so an entry highlights Journal and a week highlights Garden. */
function sectionOf(pathname: string): string {
  if (pathname.startsWith('/look-back') || pathname.startsWith('/themes')) return '/look-back';
  if (pathname.startsWith('/garden') || pathname.startsWith('/week')) return '/garden';
  if (pathname.startsWith('/settings')) return '/settings';
  return '/';
}

/** The main sections, always in the same place. The current one is dark; the rest are muted. */
export function AppNav() {
  const router = useRouter();
  const current = sectionOf(usePathname());
  return (
    <View className="flex-row items-center gap-3 sm:gap-6" accessibilityRole="menu">
      {ITEMS.map(({ label, href }) => {
        const active = href === current;
        return (
          <Pressable
            key={href}
            accessibilityRole="link"
            accessibilityState={{ selected: active }}
            // navigate() returns to the screen if it is already open instead of stacking another copy.
            onPress={() => !active && router.navigate(href)}
            className="min-h-11 justify-center hover:opacity-70"
          >
            <Text className={`text-[13px] sm:text-sm ${active ? 'font-semibold text-ink' : 'text-muted'}`}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
