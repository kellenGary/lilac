import { Text, View } from 'react-native';

import { useColors } from '@/state/theme';
import { Button } from './Button';
import { FaceMark } from './FaceMark';

/**
 * Covers the whole app. Without `onUnlock` it is only a privacy cover (shown while the app is in the app switcher);
 * with it, it asks the user to unlock.
 */
export function LockScreen({
  onUnlock,
  onSignOut,
}: {
  onUnlock?: () => void;
  onSignOut?: () => void;
}) {
  const { cream } = useColors();
  return (
    <View
      accessibilityViewIsModal
      className="items-center justify-center gap-6 px-8"
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000, backgroundColor: cream }}
    >
      <FaceMark size={56} />
      {onUnlock && (
        <>
          <View className="items-center gap-2">
            <Text accessibilityRole="header" className="text-2xl font-bold text-ink">
              Lilac Pages is locked
            </Text>
            <Text className="text-center text-[15px] leading-[22px] text-body">
              Unlock to read and write in your journal.
            </Text>
          </View>
          <View className="items-center gap-3">
            <Button size="lg" label="Unlock" onPress={onUnlock} />
            {onSignOut && <Button variant="ghost" label="Sign out" onPress={onSignOut} />}
          </View>
        </>
      )}
    </View>
  );
}
