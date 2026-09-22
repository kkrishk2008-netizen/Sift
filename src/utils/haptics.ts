import * as Haptics from 'expo-haptics';

let enabled = true;
export const setHapticsEnabled = (v: boolean) => {
  enabled = v;
};

const safe = (fn: () => Promise<void>) => {
  if (!enabled) return;
  fn().catch(() => undefined);
};

export const hapticTap = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const hapticMedium = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
export const hapticSuccess = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
export const hapticWarning = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
export const hapticSelect = () => safe(() => Haptics.selectionAsync());
