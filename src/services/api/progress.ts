import { database } from '../../database';
import WeightLog from '../../database/models/WeightLog';
import Meal from '../../database/models/Meal';
import User from '../../database/models/User';
import { Q } from '@nozbe/watermelondb';
import { handleError } from '../../utils/errors';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

export interface WeightDataPoint {
    date: Date;
    weight: number;
}

export interface CalorieDataPoint {
    date: Date;
    calories: number;
    target: number;
}

/**
 * Get recent weight logs
 */
export async function getWeightHistory(userId: string, limit: number = 30): Promise<WeightDataPoint[]> {
    try {
        const weightLogsCollection = database.get<WeightLog>('weight_logs');
        const logs = await weightLogsCollection
            .query(
                Q.where('user_id', userId),
                Q.sortBy('logged_at', Q.desc),
                Q.take(limit)
            )
            .fetch();

        // Return in ascending order for charts
        return logs.map(log => ({
            date: new Date(log.loggedAt),
            weight: log.weight
        })).reverse();
    } catch (error) {
        handleError(error, 'progressApi.getWeightHistory');
        throw error;
    }
}

/**
 * Log a new weight entry
 */
export async function logWeight(userId: string, weight: number, bodyFat?: number): Promise<WeightLog> {
    try {
        let log: WeightLog | null = null;
        await database.write(async () => {
            const weightLogsCollection = database.get<WeightLog>('weight_logs');
            log = await weightLogsCollection.create(w => {
                w.userId = userId;
                w.weight = weight;
                if (bodyFat) w.bodyFatPercentage = bodyFat;
                w.loggedAt = Date.now();
            });

            // Also update user's current weight
            const usersCollection = database.get<User>('users');
            const user = await usersCollection.find(userId);
            await user.update(u => {
                u.weight = weight;
            });
        });
        return log!;
    } catch (error) {
        handleError(error, 'progressApi.logWeight');
        throw error;
    }
}

/**
 * Get calorie history for the last N days
 */
export async function getCalorieHistory(userId: string, days: number = 7): Promise<CalorieDataPoint[]> {
    try {
        const endDate = new Date();
        const startDate = subDays(endDate, days - 1);

        const mealsCollection = database.get<Meal>('meals');
        // Note: WatermelonDB doesn't support complex aggregation queries easily
        // So we query meals in range and aggregate in JS. For 7 days it's fine.

        const meals = await mealsCollection
            .query(
                Q.where('user_id', userId),
                Q.where('consumed_at', Q.gte(startOfDay(startDate).getTime())),
                Q.where('consumed_at', Q.lte(endOfDay(endDate).getTime()))
            )
            .fetch();

        const dailyMap = new Map<string, number>();

        // Initialize map with 0
        for (let i = 0; i < days; i++) {
            const d = subDays(endDate, i);
            dailyMap.set(format(d, 'yyyy-MM-dd'), 0);
        }

        // Sum calories
        meals.forEach(meal => {
            const dayKey = format(new Date(meal.consumedAt), 'yyyy-MM-dd');
            const current = dailyMap.get(dayKey) || 0;
            dailyMap.set(dayKey, current + meal.totalCalories);
        });

        // Get user target (simplified - taking current target)
        // In a real app we might want historical targets if tracked
        const usersCollection = database.get<User>('users');
        const user = await usersCollection.find(userId);
        const target = user.calorieTarget || 2000;

        // Convert to array
        const result: CalorieDataPoint[] = [];
        const sortedKeys = Array.from(dailyMap.keys()).sort();

        sortedKeys.forEach(key => {
            result.push({
                date: new Date(key),
                calories: dailyMap.get(key) || 0,
                target: target
            });
        });

        return result;

    } catch (error) {
        handleError(error, 'progressApi.getCalorieHistory');
        throw error;
    }
}
