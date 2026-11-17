import { useRouter, usePathname } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Modal, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useColors } from '@/state/theme';

const ITEMS = [
  { label: 'Journal', href: '/' },
  { label: 'Look back', href: '/look-back' },
  { label: 'To do', href: '/todo' },
  { label: 'Profile', href: '/profile' },
] as const;

/** Which section a path belongs to, so an entry highlights Journal and a week highlights Garden. */
function sectionOf(pathname: string): string {
  if (pathname.startsWith('/look-back') || pathname.startsWith('/themes')) return '/look-back';
  if (pathname.startsWith('/todo')) return '/todo';
  if (pathname.startsWith('/profile') || pathname.startsWith('/settings')) return '/profile';
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

/**
 * The same sections as AppNav, folded into a menu button for narrow screens (a phone browser). The list opens as a
 * dropdown under the button; tapping outside it, a section, or the back button closes it.
 */
export function AppNavMenu() {
  const router = useRouter();
  const current = sectionOf(usePathname());
  // The popup renders outside the app's theme wrapper, so it takes its colors directly rather than from classNames.
  const { ink, body, surface, line, track, shadow } = useColors();
  const { width: windowWidth } = useWindowDimensions();
  const buttonRef = useRef<ComponentRef<typeof Pressable>>(null);
  // Where the dropdown sits, measured from the button when it opens. Null means closed.
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);

  const open = () =>
    buttonRef.current?.measureInWindow((x, y, w, h) =>
      setAnchor({ top: y + h + 4, right: Math.max(8, windowWidth - (x + w)) }),
    );
  const close = () => setAnchor(null);
  const isOpen = anchor !== null;

  // Web: Escape closes it (the popup doesn't do this on its own there).
  useEffect(() => {
    if (Platform.OS !== 'web' || !isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAnchor(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  return (
    <View>
      <Pressable
        ref={buttonRef}
        accessibilityRole="button"
        accessibilityLabel="Menu"
        accessibilityState={{ expanded: isOpen }}
        onPress={isOpen ? close : open}
        className="h-11 w-11 items-center justify-center rounded-full hover:opacity-70"
      >
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path d="M4 7h16M4 12h16M4 17h16" stroke={ink} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        statusBarTranslucent={Platform.OS === 'android'}
        onRequestClose={close}
      >
        {/* Anything outside the list closes it. */}
        <Pressable accessibilityLabel="Close menu" onPress={close} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />
        {anchor && (
          <View
            accessibilityRole="menu"
            className="absolute w-52 rounded-2xl border p-2"
            style={{
              backgroundColor: surface,
              borderColor: line,
              top: anchor.top,
              right: anchor.right,
              shadowColor: shadow,
              shadowOpacity: 0.12,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 8 },
              elevation: 8,
            }}
          >
            {ITEMS.map(({ label, href }) => {
              const active = href === current;
              return (
                <Pressable
                  key={href}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    close();
                    if (!active) router.navigate(href);
                  }}
                  className="min-h-11 justify-center rounded-xl px-3 hover:opacity-70"
                  style={active ? { backgroundColor: track } : undefined}
                >
                  <Text className={`text-base ${active ? 'font-semibold' : ''}`} style={{ color: active ? ink : body }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </Modal>
    </View>
  );
}
