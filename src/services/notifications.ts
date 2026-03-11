import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './apiWrapper';
import { EXPO_PUBLIC_ENABLE_REMOTE_PUSH, EXPO_PUBLIC_PUSH_TOKEN_PATH } from '../constants/env';
import { getAuthToken } from '../utils/storage';
import { getProgressInsights } from './api/progress';
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

const resolveExpoProjectId = (): string | null => {
    const projectIdFromExpoConfig = Constants.expoConfig?.extra?.eas?.projectId;
    if (typeof projectIdFromExpoConfig === 'string' && projectIdFromExpoConfig.trim().length > 0) {
        return projectIdFromExpoConfig.trim();
    }

    const projectIdFromEasConfig = Constants.easConfig?.projectId;
    if (typeof projectIdFromEasConfig === 'string' && projectIdFromEasConfig.trim().length > 0) {
        return projectIdFromEasConfig.trim();
    }

    return null;
};

const normalizePushTokenPath = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) {
        return '/notifications/expo-token';
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
        return trimmed;
    }

    return `/${trimmed}`;
};

export async function registerRemotePushTokenIfEnabled(): Promise<void> {
    if (!EXPO_PUBLIC_ENABLE_REMOTE_PUSH) {
        return;
    }

    const authToken = await getAuthToken();
    if (!authToken) {
        return;
    }

    const projectId = resolveExpoProjectId();
    if (!projectId) {
        console.warn('[Notifications] Remote push enabled but EAS projectId is missing.');
        return;
    }

    try {
        const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
        const expoPushToken = tokenResponse.data;

        if (!expoPushToken) {
            console.warn('[Notifications] Expo push token is empty.');
            return;
        }

        await api.post(
            normalizePushTokenPath(EXPO_PUBLIC_PUSH_TOKEN_PATH),
            {
                token: expoPushToken,
                platform: Platform.OS,
                projectId,
            },
            {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
                suppressErrors: true,
                retryCount: 0,
                timeout: 10000,
            },
        );
    } catch (error) {
        console.warn('[Notifications] Remote push token registration failed:', error);
    }
}

export async function registerForPushNotificationsAsync(): Promise<boolean> {
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

    await registerRemotePushTokenIfEnabled();

    return true;
}

export async function scheduleAdaptiveReminders(userId?: string) {
    if (!userId) {
        return scheduleSmartReminders();
    }

    try {
        const insights = await getProgressInsights(userId, 14);
        const nowHour = new Date().getHours();

        const workoutHour = insights.workoutsThisWeek < 3 ? 17 : 19;
        const includeWater = insights.hydrationGoalRate < 80;
        const includeStreakWarning = insights.currentMealStreakDays < 3;
        const includeMeals = nowHour <= 20;

        return scheduleSmartReminders({
            workoutHour,
            includeWater,
            includeMeals,
            includeStreakWarning,
            includeWorkout: true,
        });
    } catch {
        return scheduleSmartReminders();
    }
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
