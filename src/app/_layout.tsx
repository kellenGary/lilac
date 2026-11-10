import '../../global.css';

import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoadingScreen } from '@/shared-components';
import { AuthProvider, useAuth } from '@/state/auth';
import { ConsentProvider, useConsent } from '@/state/consent';
import { EntriesProvider } from '@/state/entries';
import { TransitionProvider } from '@/state/transition';
import { ThemeProvider, useTheme } from '@/state/theme';

function ThemedStatusBar() {
  return <StatusBar style={useTheme().isDark ? 'light' : 'dark'} />;
}

function Routes() {
  const { session, loading } = useAuth();
  const { palette } = useTheme();
  const consent = useConsent();
  const router = useRouter();
  const hadSession = useRef(false);
  // When the guards drop every screen the user was on, the stack falls back to a screen that is always available
  // (privacy). Send a signed-out user to sign-in explicitly instead.
  useEffect(() => {
    if (loading) return;
    if (hadSession.current && !session) router.replace('/sign-in');
    hadSession.current = !!session;
  }, [session, loading, router]);
  if (loading || (session && !consent.ready)) return <LoadingScreen />; // reading the stored session; avoids flashing the sign-in screen

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.cream }, animation: 'fade' }}>
      <Stack.Protected guard={!!session && consent.accepted}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="finish" />
        <Stack.Screen name="safety" />
        <Stack.Screen name="week/[start]" />
        <Stack.Screen
          name="entry/[date]"
          options={{ animation: Platform.OS === 'web' ? 'fade' : 'slide_from_right' }}
        />
        <Stack.Screen name="write" options={{ animation: Platform.OS === 'web' ? 'fade' : 'fade_from_bottom' }} />
      </Stack.Protected>
      <Stack.Protected guard={!!session && !consent.accepted}>
        <Stack.Screen name="consent" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Screen name="privacy" />
      <Stack.Screen name="support" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ConsentProvider>
            <EntriesProvider>
              <TransitionProvider>
                <Routes />
                <ThemedStatusBar />
              </TransitionProvider>
            </EntriesProvider>
          </ConsentProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
