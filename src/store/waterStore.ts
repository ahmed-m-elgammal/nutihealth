import { create } from 'zustand';
import { Q } from '@nozbe/watermelondb';
import { database } from '../database';
import WaterLog from '../database/models/WaterLog';
import WaterTarget from '../database/models/WaterTarget';
import User from '../database/models/User';
import Workout from '../database/models/Workout';
import { handleError } from '../utils/errors';
import { storage } from '../utils/storage-adapter';
import { getUserId } from '../utils/storage';
import {
    calculateDailyHydration,
    calculateWeatherWaterAdjustment,
    calculateWorkoutWaterAdjustment,
} from '../utils/nutrition';

type ContainerType = 'glass' | 'bottle_small' | 'bottle_large' | 'custom';
type HydrationStatus = 'behind' | 'on_track' | 'exceeded';

interface WaterStore {
    todaysLogs: WaterLog[];
    todaysTarget: WaterTarget | null;
    totalConsumed: number;
    targetAmount: number;
    percentage: number;
    remindersEnabled: boolean;
    lastReminderTime: number | null;
    containerSizes: Record<ContainerType, number>;
    isLoading: boolean;
    error: string | null;
    loadTodaysWater: () => Promise<void>;
    addWaterLog: (amount: number, containerType?: ContainerType) => Promise<void>;
    deleteWaterLog: (id: string) => Promise<void>;
    updateTarget: (newTarget: number) => Promise<void>;
    calculateDynamicTarget: (weatherTemp?: number, workoutDurationMinutes?: number) => Promise<number>;
    loadReminderPreference: () => Promise<void>;
    setRemindersEnabled: (enabled: boolean) => Promise<void>;
    getHydrationStatus: () => HydrationStatus;
    setReminderTime: (time: number) => void;
}

const DEFAULT_TARGET_ML = 2000;
const WATER_REMINDER_STORAGE_KEY = 'water_reminders_enabled';

function getDayRange(): { startOfDay: number; endOfDay: number } {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { startOfDay: start.getTime(), endOfDay: end.getTime() };
}

async function getCurrentUser(): Promise<User | null> {
    const currentUserId = await getUserId();
    if (!currentUserId) {
        return null;
    }

    const usersCollection = database.get<User>('users');
    try {
        return await usersCollection.find(currentUserId);
    } catch {
        return null;
    }
}

function getProfileBasedTarget(user: User | null): number {
    if (!user) {
        return DEFAULT_TARGET_ML;
    }

    const hydration = calculateDailyHydration(user.weight, user.activityLevel);
    return hydration.totalHydrationMl;
}

function getBaseTargetFromProfile(user: User): number {
    const hydration = calculateDailyHydration(user.weight, user.activityLevel);
    return hydration.baseHydrationMl + hydration.activityBonusMl;
}

async function getTotalWorkoutMinutesForDay(userId: string, startOfDay: number, endOfDay: number): Promise<number> {
    const workoutsCollection = database.get<Workout>('workouts');
    const workouts = await workoutsCollection
        .query(
            Q.where('user_id', userId),
            Q.where('started_at', Q.gte(startOfDay)),
            Q.where('started_at', Q.lte(endOfDay)),
        )
        .fetch();

    return workouts.reduce((sum, workout) => sum + Math.max(0, Math.round(workout.duration || 0)), 0);
}

export const useWaterStore = create<WaterStore>((set, get) => {
    let pendingOperationCount = 0;
    let addWaterLocked = false;

    const beginOperation = () => {
        pendingOperationCount += 1;
        set({ isLoading: true });
    };

    const endOperation = () => {
        pendingOperationCount = Math.max(0, pendingOperationCount - 1);
        set({ isLoading: pendingOperationCount > 0 });
    };

    return {
        todaysLogs: [],
        todaysTarget: null,
        totalConsumed: 0,
        targetAmount: DEFAULT_TARGET_ML,
        percentage: 0,
        remindersEnabled: false,
        lastReminderTime: null,
        containerSizes: {
            glass: 250,
            bottle_small: 500,
            bottle_large: 1000,
            custom: 0,
        },
        isLoading: false,
        error: null,

        loadTodaysWater: async () => {
            beginOperation();
            set({ error: null });
            try {
                const { startOfDay, endOfDay } = getDayRange();
                const waterLogsCollection = database.get<WaterLog>('water_logs');
                const waterTargetsCollection = database.get<WaterTarget>('water_targets');
                const user = await getCurrentUser();

                if (!user) {
                    set({
                        todaysLogs: [],
                        todaysTarget: null,
                        totalConsumed: 0,
                        targetAmount: DEFAULT_TARGET_ML,
                        percentage: 0,
                    });
                    return;
                }

                const [logs, targets] = await Promise.all([
                    waterLogsCollection
                        .query(
                            Q.where('user_id', user.id),
                            Q.where('logged_at', Q.gte(startOfDay)),
                            Q.where('logged_at', Q.lte(endOfDay)),
                            Q.sortBy('logged_at', Q.desc),
                        )
                        .fetch(),
                    waterTargetsCollection
                        .query(Q.where('user_id', user.id), Q.where('date', Q.eq(startOfDay)))
                        .fetch(),
                ]);

                let targetRecord = targets.length > 0 ? targets[0] : null;
                const profileTarget = getProfileBasedTarget(user);
                const profileBaseTarget = getBaseTargetFromProfile(user);

                if (targetRecord && Math.abs(targetRecord.baseTarget - profileBaseTarget) >= 1) {
                    const weatherAdjustment = targetRecord.weatherAdjustment || 0;
                    const workoutAdjustment = targetRecord.workoutAdjustment || 0;
                    const totalTarget = profileBaseTarget + weatherAdjustment + workoutAdjustment;

                    await database.write(async () => {
                        await targetRecord!.update((record) => {
                            record.baseTarget = profileBaseTarget;
                            record.totalTarget = totalTarget;
                        });
                    });
                }

                const targetAmount = targetRecord?.totalTarget || profileTarget;
                const totalConsumed = logs.reduce((sum, log) => sum + log.amount, 0);
                const percentage = targetAmount > 0 ? Math.min((totalConsumed / targetAmount) * 100, 100) : 0;

                set({
                    todaysLogs: logs,
                    todaysTarget: targetRecord,
                    totalConsumed,
                    targetAmount,
                    percentage,
                });
            } catch (error) {
                handleError(error, 'waterStore.loadTodaysWater');
                set({ error: (error as Error).message });
            } finally {
                endOperation();
            }
        },

        addWaterLog: async (amount: number, containerType?: ContainerType) => {
            if (addWaterLocked) {
                return;
            }

            addWaterLocked = true;
            beginOperation();
            set({ error: null });
            try {
                const user = await getCurrentUser();
                if (!user) {
                    set({ error: 'No user found. Please complete onboarding first.' });
                    return;
                }

                const actualAmount =
                    containerType && containerType !== 'custom' ? get().containerSizes[containerType] : amount;

                await database.write(async () => {
                    const waterLogsCollection = database.get<WaterLog>('water_logs');
                    await waterLogsCollection.create((newLog) => {
                        newLog.userId = user.id;
                        newLog.amount = actualAmount;
                        newLog.loggedAt = Date.now();
                    });
                });

                await get().loadTodaysWater();
            } catch (error) {
                handleError(error, 'waterStore.addWaterLog');
                set({ error: (error as Error).message });
            } finally {
                addWaterLocked = false;
                endOperation();
            }
        },

        deleteWaterLog: async (id: string) => {
            beginOperation();
            set({ error: null });
            try {
                const waterLogsCollection = database.get<WaterLog>('water_logs');
                const log = await waterLogsCollection.find(id);

                await database.write(async () => {
                    await log.markAsDeleted();
                });

                await get().loadTodaysWater();
            } catch (error) {
                handleError(error, 'waterStore.deleteWaterLog');
                set({ error: (error as Error).message });
            } finally {
                endOperation();
            }
        },

        updateTarget: async (newTarget: number) => {
            beginOperation();
            set({ error: null });
            try {
                const user = await getCurrentUser();
                if (!user) {
                    set({ error: 'No user found. Please complete onboarding first.' });
                    return;
                }

                const { startOfDay } = getDayRange();
                const waterTargetsCollection = database.get<WaterTarget>('water_targets');
                const existingTargets = await waterTargetsCollection
                    .query(Q.where('user_id', user.id), Q.where('date', Q.eq(startOfDay)))
                    .fetch();

                await database.write(async () => {
                    if (existingTargets.length > 0) {
                        await existingTargets[0].update((record) => {
                            record.baseTarget = newTarget;
                            record.workoutAdjustment = 0;
                            record.weatherAdjustment = 0;
                            record.totalTarget = newTarget;
                        });
                    } else {
                        await waterTargetsCollection.create((record) => {
                            record.userId = user.id;
                            record.date = startOfDay;
                            record.baseTarget = newTarget;
                            record.workoutAdjustment = 0;
                            record.weatherAdjustment = 0;
                            record.totalTarget = newTarget;
                        });
                    }
                });

                await get().loadTodaysWater();
            } catch (error) {
                handleError(error, 'waterStore.updateTarget');
                set({ error: (error as Error).message });
            } finally {
                endOperation();
            }
        },

        calculateDynamicTarget: async (weatherTemp?: number, workoutDurationMinutes = 0) => {
            beginOperation();
            try {
                const user = await getCurrentUser();
                if (!user) {
                    throw new Error('No user found. Please complete onboarding first.');
                }

                const hydration = calculateDailyHydration(user.weight, user.activityLevel);
                const baseTarget = hydration.baseHydrationMl + hydration.activityBonusMl;

                const { startOfDay, endOfDay } = getDayRange();
                const waterTargetsCollection = database.get<WaterTarget>('water_targets');
                const existingTargets = await waterTargetsCollection
                    .query(Q.where('user_id', user.id), Q.where('date', Q.eq(startOfDay)))
                    .fetch();

                const existingTarget = existingTargets.length > 0 ? existingTargets[0] : null;
                const weatherAdjustment =
                    typeof weatherTemp === 'number'
                        ? calculateWeatherWaterAdjustment(weatherTemp, 60)
                        : existingTarget?.weatherAdjustment || 0;

                const manualDuration = Number.isFinite(workoutDurationMinutes)
                    ? Math.max(0, Math.round(workoutDurationMinutes))
                    : 0;
                const totalWorkoutMinutes =
                    manualDuration > 0
                        ? manualDuration
                        : await getTotalWorkoutMinutesForDay(user.id, startOfDay, endOfDay);

                const workoutAdjustment = calculateWorkoutWaterAdjustment(totalWorkoutMinutes, 'recommended');
                const totalTarget = baseTarget + workoutAdjustment + weatherAdjustment;

                await database.write(async () => {
                    if (existingTargets.length > 0) {
                        await existingTargets[0].update((record) => {
                            record.baseTarget = baseTarget;
                            record.weatherAdjustment = weatherAdjustment;
                            record.workoutAdjustment = workoutAdjustment;
                            record.totalTarget = totalTarget;
                        });
                    } else {
                        await waterTargetsCollection.create((record) => {
                            record.userId = user.id;
                            record.date = startOfDay;
                            record.baseTarget = baseTarget;
                            record.weatherAdjustment = weatherAdjustment;
                            record.workoutAdjustment = workoutAdjustment;
                            record.totalTarget = totalTarget;
                        });
                    }
                });

                await get().loadTodaysWater();
                return totalTarget;
            } catch (error) {
                handleError(error, 'waterStore.calculateDynamicTarget');
                throw error;
            } finally {
                endOperation();
            }
        },

        loadReminderPreference: async () => {
            try {
                const storedValue = await storage.getItem(WATER_REMINDER_STORAGE_KEY);
                set({ remindersEnabled: storedValue === 'true' });
            } catch (error) {
                handleError(error, 'waterStore.loadReminderPreference');
            }
        },

        setRemindersEnabled: async (enabled: boolean) => {
            set({ remindersEnabled: enabled });
            try {
                await storage.setItem(WATER_REMINDER_STORAGE_KEY, enabled ? 'true' : 'false');
            } catch (error) {
                handleError(error, 'waterStore.setRemindersEnabled');
                set({ error: (error as Error).message });
            }
        },

        getHydrationStatus: (): HydrationStatus => {
            const { totalConsumed, targetAmount } = get();
            const percentage = targetAmount > 0 ? (totalConsumed / targetAmount) * 100 : 0;

            if (percentage >= 100) return 'exceeded';
            if (percentage >= 80) return 'on_track';
            return 'behind';
        },

        setReminderTime: (time: number) => {
            set({ lastReminderTime: time });
        },
    };
});
