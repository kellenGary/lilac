import { Stack } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { Platform } from 'react-native';

import { useColors } from '@/state/theme';

/**
 * The four main sections. On iPhone this is the system tab bar (Liquid Glass on iOS 26, drawn by the OS, at the
 * bottom of the screen). On web and Android there is no system bar here: the pages show their own navigation links
 * in the header (see AppNav), so this is just a plain stack.
 */
export default function TabsLayout() {
  const { cream } = useColors();

  if (Platform.OS !== 'ios') {
    return (
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cream }, animation: 'fade' }} />
    );
  }

  return (
    // Default system tint; the glass itself adapts to what is behind it.
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'book', selected: 'book.fill' }} />
        <NativeTabs.Trigger.Label>Journal</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="look-back">
        <NativeTabs.Trigger.Icon sf={{ default: 'calendar', selected: 'calendar' }} />
        <NativeTabs.Trigger.Label>Look back</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="garden">
        <NativeTabs.Trigger.Icon sf={{ default: 'leaf', selected: 'leaf.fill' }} />
        <NativeTabs.Trigger.Label>Garden</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
