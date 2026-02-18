import * as Notifications from 'expo-notifications';
import { storage } from '../../utils/storage-adapter';

const SCHEDULED_IDS_STORAGE_KEY = 'notifications_scheduled_ids_v1';

export interface ReminderScheduleOptions {
    includeWater: boolean;
    includeMeals: boolean;
    includeWorkout: boolean;
    includeStreakWarning: boolean;
    workoutHour: number;
}

const DEFAULT_REMINDER_OPTIONS: ReminderScheduleOptions = {
    includeWater: true,
    includeMeals: true,
    includeWorkout: true,
    includeStreakWarning: true,
    workoutHour: 18,
};

const toCalendarTrigger = (hour: number, minute: number): Notifications.CalendarTriggerInput => ({
    type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
    hour,
    minute,
    repeats: true,
});

async function getStoredScheduledIds(): Promise<string[]> {
    const raw = await storage.getItem(SCHEDULED_IDS_STORAGE_KEY);
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter((entry): entry is string => typeof entry === 'string');
    } catch {
        return [];
    }
}

async function persistScheduledIds(ids: string[]): Promise<void> {
    await storage.setItem(SCHEDULED_IDS_STORAGE_KEY, JSON.stringify(ids));
}

async function scheduleReminder(
    content: Notifications.NotificationContentInput,
    hour: number,
    minute: number,
): Promise<string> {
    return Notifications.scheduleNotificationAsync({
        content,
        trigger: toCalendarTrigger(hour, minute),
    });
}

export async function clearScheduledReminders(): Promise<void> {
    const scheduledIds = await getStoredScheduledIds();

    if (scheduledIds.length > 0) {
        await Promise.all(
            scheduledIds.map(async (id) => {
                try {
                    await Notifications.cancelScheduledNotificationAsync(id);
                } catch {
                    // Ignore missing/deleted IDs from previous installs.
                }
            }),
        );
    }

    await persistScheduledIds([]);
}

export async function scheduleSmartReminders(options?: Partial<ReminderScheduleOptions>): Promise<string[]> {
    const mergedOptions: ReminderScheduleOptions = {
        ...DEFAULT_REMINDER_OPTIONS,
        ...options,
    };

    await clearScheduledReminders();

    const ids: string[] = [];

    if (mergedOptions.includeWater) {
        ids.push(
            await scheduleReminder(
                {
                    title: 'Hydration Check',
                    body: 'Have you reached your water goal today?',
                },
                10,
                0,
            ),
        );

        ids.push(
            await scheduleReminder(
                {
                    title: 'Afternoon Boost',
                    body: "Don't forget to log water and meals.",
                },
                14,
                0,
            ),
        );
    }

    if (mergedOptions.includeMeals) {
        ids.push(
            await scheduleReminder(
                {
                    title: 'Breakfast Reminder',
                    body: 'Log your breakfast to stay on target.',
                },
                8,
                0,
            ),
        );

        ids.push(
            await scheduleReminder(
                {
                    title: 'Lunch Reminder',
                    body: 'Time to log your lunch and macros.',
                },
                13,
                0,
            ),
        );

        ids.push(
            await scheduleReminder(
                {
                    title: 'Dinner Reminder',
                    body: 'Wrap up your day by logging dinner.',
                },
                19,
                0,
            ),
        );
    }

    if (mergedOptions.includeWorkout) {
        ids.push(
            await scheduleReminder(
                {
                    title: 'Workout Reminder',
                    body: 'Keep your streak alive with today’s workout.',
                },
                mergedOptions.workoutHour,
                0,
            ),
        );
    }

    if (mergedOptions.includeStreakWarning) {
        ids.push(
            await scheduleReminder(
                {
                    title: 'Streak Warning',
                    body: 'You still have time to complete today’s habits.',
                },
                20,
                0,
            ),
        );
    }

    await persistScheduledIds(ids);
    return ids;
}

export async function getScheduledRemindersCount(): Promise<number> {
    const ids = await getStoredScheduledIds();
    return ids.length;
}
