/**
 * Small vibrations as feedback for important actions. Haptics are a bonus:
 * if the device does not support them, nothing happens.
 */

import * as Haptics from "expo-haptics";

export function hapticSuccess(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

export function hapticLight(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

export function hapticSelection(): void {
  Haptics.selectionAsync().catch(() => undefined);
}
