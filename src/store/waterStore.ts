import { create } from 'zustand';
import { Q } from '@nozbe/watermelondb';
import { database } from '../database';
import WaterLog from '../database/models/WaterLog';
import WaterTarget from '../database/models/WaterTarget';
import User from '../database/models/User';
import { handleError } from '../utils/errors';
import {
    calculateDailyHydration,
    calculateWeatherWaterAdjustment,
    calculateWorkoutWaterAdjustment,
} from '../utils/calculations';

type ContainerType = 'glass' | 'bottle_small' | 'bottle_large' | 'custom';
type HydrationStatus = 'behind' | 'on_track' | 'exceeded';

interface WaterStore {
    todaysLogs: WaterLog[];
    todaysTarget: WaterTarget | null;
    totalConsumed: number;
    targetAmount: number;
    percentage: number;
    lastReminderTime: number | null;
    containerSizes: Record<ContainerType, number>;
    isLoading: boolean;
    error: string | null;
    loadTodaysWater: () => Promise<void>;
    addWaterLog: (amount: number, containerType?: ContainerType) => Promise<void>;
    deleteWaterLog: (id: string) => Promise<void>;
    updateTarget: (newTarget: number) => Promise<void>;
    calculateDynamicTarget: (weatherTemp?: number, workoutDurationMinutes?: number) => Promise<number>;
    getHydrationStatus: () => HydrationStatus;
    setReminderTime: (time: number) => void;
}

const DEFAULT_TARGET_ML = 2000;

function getDayRange(): { startOfDay: number; endOfDay: number } {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { startOfDay: start.getTime(), endOfDay: end.getTime() };
}

async function getCurrentUser(): Promise<User | null> {
    const usersCollection = database.get<User>('users');
    const users = await usersCollection.query().fetch();
    return users.length > 0 ? users[0] : null;
}

function getProfileBasedTarget(user: User | null): number {
    if (!user) {
        return DEFAULT_TARGET_ML;
    }

    const hydration = calculateDailyHydration(user.weight, user.activityLevel);
    return hydration.totalHydrationMl;
}

export const useWaterStore = create<WaterStore>((set, get) => ({
    todaysLogs: [],
    todaysTarget: null,
    totalConsumed: 0,
    targetAmount: DEFAULT_TARGET_ML,
    percentage: 0,
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
        try {
            set({ isLoading: true, error: null });

            const { startOfDay, endOfDay } = getDayRange();
            const waterLogsCollection = database.get<WaterLog>('water_logs');
            const waterTargetsCollection = database.get<WaterTarget>('water_targets');

            const [logs, targets, user] = await Promise.all([
                waterLogsCollection
                    .query(
                        Q.where('logged_at', Q.gte(startOfDay)),
                        Q.where('logged_at', Q.lte(endOfDay)),
                        Q.sortBy('logged_at', Q.desc)
                    )
                    .fetch(),
                waterTargetsCollection
                    .query(Q.where('date', Q.eq(startOfDay)))
                    .fetch(),
                getCurrentUser(),
            ]);

            const targetRecord = targets.length > 0 ? targets[0] : null;
            const profileTarget = getProfileBasedTarget(user);
            const targetAmount = targetRecord?.totalTarget || profileTarget;
            const totalConsumed = logs.reduce((sum, log) => sum + log.amount, 0);
            const percentage = targetAmount > 0 ? Math.min((totalConsumed / targetAmount) * 100, 100) : 0;

            set({
                todaysLogs: logs,
                todaysTarget: targetRecord,
                totalConsumed,
                targetAmount,
                percentage,
                isLoading: false,
            });
        } catch (error) {
            handleError(error, 'waterStore.loadTodaysWater');
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    addWaterLog: async (amount: number, containerType?: ContainerType) => {
        try {
            set({ isLoading: true, error: null });

            const user = await getCurrentUser();
            if (!user) {
                set({ isLoading: false, error: 'No user found. Please complete onboarding first.' });
                return;
            }

            const actualAmount =
                containerType && containerType !== 'custom'
                    ? get().containerSizes[containerType]
                    : amount;

            await database.write(async () => {
                const waterLogsCollection = database.get<WaterLog>('water_logs');
                await waterLogsCollection.create((newLog) => {
                    newLog.userId = user.id;
                    newLog.amount = actualAmount;
                    newLog.loggedAt = Date.now();
                });
            });

            await get().loadTodaysWater();
            set({ isLoading: false });
        } catch (error) {
            handleError(error, 'waterStore.addWaterLog');
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    deleteWaterLog: async (id: string) => {
        try {
            set({ isLoading: true, error: null });

            const waterLogsCollection = database.get<WaterLog>('water_logs');
            const log = await waterLogsCollection.find(id);

            await database.write(async () => {
                await log.markAsDeleted();
            });

            await get().loadTodaysWater();
            set({ isLoading: false });
        } catch (error) {
            handleError(error, 'waterStore.deleteWaterLog');
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    updateTarget: async (newTarget: number) => {
        try {
            set({ isLoading: true, error: null });

            const user = await getCurrentUser();
            if (!user) {
                set({ isLoading: false, error: 'No user found. Please complete onboarding first.' });
                return;
            }

            const { startOfDay } = getDayRange();
            const waterTargetsCollection = database.get<WaterTarget>('water_targets');
            const existingTargets = await waterTargetsCollection
                .query(Q.where('date', Q.eq(startOfDay)))
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
            set({ isLoading: false });
        } catch (error) {
            handleError(error, 'waterStore.updateTarget');
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    calculateDynamicTarget: async (weatherTemp?: number, workoutDurationMinutes = 0) => {
        try {
            const user = await getCurrentUser();
            if (!user) {
                throw new Error('No user found. Please complete onboarding first.');
            }

            const hydration = calculateDailyHydration(user.weight, user.activityLevel);
            const baseTarget = hydration.baseHydrationMl + hydration.activityBonusMl;
            const workoutAdjustment = calculateWorkoutWaterAdjustment(workoutDurationMinutes, 'recommended');
            const weatherAdjustment = typeof weatherTemp === 'number'
                ? calculateWeatherWaterAdjustment(weatherTemp, 60)
                : 0;
            const totalTarget = baseTarget + workoutAdjustment + weatherAdjustment;

            const { startOfDay } = getDayRange();
            const waterTargetsCollection = database.get<WaterTarget>('water_targets');
            const existingTargets = await waterTargetsCollection
                .query(Q.where('date', Q.eq(startOfDay)))
                .fetch();

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
}));
