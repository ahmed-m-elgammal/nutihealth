import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { clearScheduledReminders, getScheduledRemindersCount, scheduleSmartReminders } from './notifications/scheduler';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export async function registerForPushNotificationsAsync(): Promise<boolean> {
    // Android Channel
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return false;
    }

    return true;
}

export async function scheduleDailyWaterReminder() {
    await scheduleSmartReminders({
        includeWater: true,
        includeMeals: false,
        includeWorkout: false,
        includeStreakWarning: false,
    });
}

export { scheduleSmartReminders, clearScheduledReminders, getScheduledRemindersCount };
