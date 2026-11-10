import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

/* App lock: Face ID / Touch ID, with the device passcode as the system's own fallback. Phones only. */

export const lockSupported = Platform.OS === 'ios' || Platform.OS === 'android';

/** True if the device can verify the user at all (biometrics or a passcode is set up). */
export async function deviceCanLock(): Promise<boolean> {
  if (!lockSupported) return false;
  try {
    return (await LocalAuthentication.getEnrolledLevelAsync()) !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

/** Shows the system prompt. Resolves true only if the user passed it. */
export async function unlockWithDevice(promptMessage: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel: 'Cancel' });
    return result.success;
  } catch {
    return false;
  }
}
