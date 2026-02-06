import { create } from 'zustand';
import { database } from '../database';
import { handleError } from '../utils/errors';
import WaterLog from '../database/models/WaterLog';
import WaterTarget from '../database/models/WaterTarget';
import { Q } from '@nozbe/watermelondb';

type ContainerType = 'glass' | 'bottle_small' | 'bottle_large' | 'custom';
type HydrationStatus = 'behind' | 'on_track' | 'exceeded';

interface WaterStore {
    todaysLogs: WaterLog[];
    todaysTarget: WaterTarget | null;
    totalConsumed: number;
    percentage: number;
    lastReminderTime: number | null;
    containerSizes: Record<ContainerType, number>;
    isLoading: boolean;
    error: string | null;

    // Actions
    loadTodaysWater: () => Promise<void>;
    addWaterLog: (amount: number, containerType?: ContainerType) => Promise<void>;
    deleteWaterLog: (id: string) => Promise<void>;
    updateTarget: (newTarget: number) => Promise<void>;
    calculateDynamicTarget: (weatherTemp?: number, workoutCalories?: number) => Promise<number>;
    getHydrationStatus: () => HydrationStatus;
    setReminderTime: (time: number) => void;
}

export const useWaterStore = create<WaterStore>((set, get) => ({
    todaysLogs: [],
    todaysTarget: null,
    totalConsumed: 0,
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

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            // Load today's water logs
            const waterLogsCollection = database.get<WaterLog>('water_logs');
            const logs = await waterLogsCollection
                .query(
                    Q.where('logged_at', Q.gte(today.getTime())),
                    Q.where('logged_at', Q.lte(endOfDay.getTime())),
                    Q.sortBy('logged_at', Q.desc)
                )
                .fetch();

            // Load today's target
            const waterTargetsCollection = database.get<WaterTarget>('water_targets');
            const targets = await waterTargetsCollection
                .query(
                    Q.where('date', Q.eq(today.getTime()))
                )
                .fetch();

            const target = targets.length > 0 ? targets[0] : null;

            // Calculate total consumed
            const total = logs.reduce((sum, log) => sum + log.amount, 0);
            const targetAmount = target?.totalTarget || 2000; // Default to 2000ml if no target
            const percentage = Math.min((total / targetAmount) * 100, 100);

            set({
                todaysLogs: logs,
                todaysTarget: target,
                totalConsumed: total,
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

            // If containerType is provided, use the predefined size
            const actualAmount = containerType && containerType !== 'custom'
                ? get().containerSizes[containerType]
                : amount;

            await database.write(async () => {
                const waterLogsCollection = database.get<WaterLog>('water_logs');
                await waterLogsCollection.create((newLog) => {
                    newLog.amount = actualAmount;
                    newLog.loggedAt = Date.now();
                });
            });

            // Reload today's water data
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

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const waterTargetsCollection = database.get<WaterTarget>('water_targets');
            const existingTargets = await waterTargetsCollection
                .query(Q.where('date', Q.eq(today.getTime())))
                .fetch();

            await database.write(async () => {
                if (existingTargets.length > 0) {
                    // Update existing target
                    await existingTargets[0].update((record) => {
                        record.totalTarget = newTarget;
                    });
                } else {
                    // Create new target
                    await waterTargetsCollection.create((newTargetRecord) => {
                        newTargetRecord.date = today.getTime();
                        newTargetRecord.baseTarget = newTarget;
                        newTargetRecord.workoutAdjustment = 0;
                        newTargetRecord.weatherAdjustment = 0;
                        newTargetRecord.totalTarget = newTarget;
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

    calculateDynamicTarget: async (weatherTemp?: number, workoutCalories?: number) => {
        try {
            // Base target: 35ml per kg body weight (we'll use a default of 2000ml)
            // In a real implementation, this would fetch from user profile
            const baseTarget = 2000;

            let weatherAdjustment = 0;
            let workoutAdjustment = 0;

            // Weather adjustment: +500ml if temp > 25°C, +250ml if temp > 20°C
            if (weatherTemp) {
                if (weatherTemp > 25) {
                    weatherAdjustment = 500;
                } else if (weatherTemp > 20) {
                    weatherAdjustment = 250;
                }
            }

            // Workout adjustment: ~500ml per hour of moderate exercise
            // Estimate: 500ml per 300 calories burned
            if (workoutCalories) {
                workoutAdjustment = Math.round((workoutCalories / 300) * 500);
            }

            const totalTarget = baseTarget + weatherAdjustment + workoutAdjustment;

            // Update or create today's target
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const waterTargetsCollection = database.get<WaterTarget>('water_targets');
            const existingTargets = await waterTargetsCollection
                .query(Q.where('date', Q.eq(today.getTime())))
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
                    await waterTargetsCollection.create((newTarget) => {
                        newTarget.date = today.getTime();
                        newTarget.baseTarget = baseTarget;
                        newTarget.weatherAdjustment = weatherAdjustment;
                        newTarget.workoutAdjustment = workoutAdjustment;
                        newTarget.totalTarget = totalTarget;
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
        const { totalConsumed, todaysTarget } = get();
        const target = todaysTarget?.totalTarget || 2000;

        const percentage = (totalConsumed / target) * 100;

        if (percentage >= 100) return 'exceeded';
        if (percentage >= 80) return 'on_track';
        return 'behind';
    },

    setReminderTime: (time: number) => {
        set({ lastReminderTime: time });
    },
}));
