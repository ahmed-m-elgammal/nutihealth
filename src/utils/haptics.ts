import * as Haptics from 'expo-haptics';

type HapticLevel = 'light' | 'medium' | 'heavy' | 'error' | 'success';

export async function triggerHaptic(level: HapticLevel) {
    try {
        switch (level) {
            case 'light':
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                return;
            case 'medium':
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                return;
            case 'heavy':
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                return;
            case 'error':
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                return;
            case 'success':
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                return;
            default:
                return;
        }
    } catch {
        // no-op: haptics unsupported on this platform/device
    }
}
