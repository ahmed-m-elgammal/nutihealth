import { database } from '../../database';
import WeightLog from '../../database/models/WeightLog';
import Meal from '../../database/models/Meal';
import User from '../../database/models/User';
import WaterLog from '../../database/models/WaterLog';
import WaterTarget from '../../database/models/WaterTarget';
import Workout from '../../database/models/Workout';
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

export interface ProgressInsights {
    averageProtein: number;
    averageCarbs: number;
    averageFats: number;
    adherenceScore: number;
    currentMealStreakDays: number;
    hydrationGoalRate: number;
    workoutsThisWeek: number;
}

/**
 * Get recent weight logs
 */
export async function getWeightHistory(userId: string, limit: number = 30): Promise<WeightDataPoint[]> {
    try {
        const weightLogsCollection = database.get<WeightLog>('weight_logs');
        const logs = await weightLogsCollection
            .query(Q.where('user_id', userId), Q.sortBy('logged_at', Q.desc), Q.take(limit))
            .fetch();

        // Return in ascending order for charts
        return logs
            .map((log) => ({
                date: new Date(log.loggedAt),
                weight: log.weight,
            }))
            .reverse();
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
            log = await weightLogsCollection.create((w) => {
                w.userId = userId;
                w.weight = weight;
                if (bodyFat) w.bodyFatPercentage = bodyFat;
                w.loggedAt = Date.now();
            });

            // Also update user's current weight
            const usersCollection = database.get<User>('users');
            const user = await usersCollection.find(userId);
            await user.update((u) => {
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
                Q.where('consumed_at', Q.lte(endOfDay(endDate).getTime())),
            )
            .fetch();

        const dailyMap = new Map<string, number>();

        // Initialize map with 0
        for (let i = 0; i < days; i++) {
            const d = subDays(endDate, i);
            dailyMap.set(format(d, 'yyyy-MM-dd'), 0);
        }

        // Sum calories
        meals.forEach((meal) => {
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

        sortedKeys.forEach((key) => {
            result.push({
                date: new Date(key),
                calories: dailyMap.get(key) || 0,
                target: target,
            });
        });

        return result;
    } catch (error) {
        handleError(error, 'progressApi.getCalorieHistory');
        throw error;
    }
}

export async function getProgressInsights(userId: string, days: number = 14): Promise<ProgressInsights> {
    try {
        const endDate = new Date();
        const startDate = subDays(endDate, days - 1);
        const rangeStart = startOfDay(startDate).getTime();
        const rangeEnd = endOfDay(endDate).getTime();

        const [meals, waterLogs, waterTargets, workouts, user] = await Promise.all([
            database
                .get<Meal>('meals')
                .query(
                    Q.where('user_id', userId),
                    Q.where('consumed_at', Q.gte(rangeStart)),
                    Q.where('consumed_at', Q.lte(rangeEnd)),
                )
                .fetch(),
            database
                .get<WaterLog>('water_logs')
                .query(
                    Q.where('user_id', userId),
                    Q.where('logged_at', Q.gte(rangeStart)),
                    Q.where('logged_at', Q.lte(rangeEnd)),
                )
                .fetch(),
            database
                .get<WaterTarget>('water_targets')
                .query(Q.where('user_id', userId), Q.where('date', Q.gte(rangeStart)), Q.where('date', Q.lte(rangeEnd)))
                .fetch(),
            database
                .get<Workout>('workouts')
                .query(
                    Q.where('user_id', userId),
                    Q.where('started_at', Q.gte(startOfDay(subDays(endDate, 6)).getTime())),
                    Q.where('started_at', Q.lte(rangeEnd)),
                )
                .fetch(),
            database.get<User>('users').find(userId),
        ]);

        const defaultTarget = user.calorieTarget || 2000;

        const byDay = new Map<
            string,
            {
                calories: number;
                protein: number;
                carbs: number;
                fats: number;
                water: number;
                waterTarget: number;
                mealLogged: boolean;
            }
        >();

        for (let i = 0; i < days; i += 1) {
            const day = subDays(endDate, i);
            byDay.set(format(day, 'yyyy-MM-dd'), {
                calories: 0,
                protein: 0,
                carbs: 0,
                fats: 0,
                water: 0,
                waterTarget: 2000,
                mealLogged: false,
            });
        }

        meals.forEach((meal) => {
            const key = format(new Date(meal.consumedAt), 'yyyy-MM-dd');
            const item = byDay.get(key);
            if (!item) return;
            item.calories += meal.totalCalories;
            item.protein += meal.totalProtein;
            item.carbs += meal.totalCarbs;
            item.fats += meal.totalFats;
            item.mealLogged = true;
        });

        waterLogs.forEach((log) => {
            const key = format(new Date(log.loggedAt), 'yyyy-MM-dd');
            const item = byDay.get(key);
            if (!item) return;
            item.water += log.amount;
        });

        waterTargets.forEach((target) => {
            const key = format(new Date(target.date), 'yyyy-MM-dd');
            const item = byDay.get(key);
            if (!item) return;
            item.waterTarget = target.totalTarget || item.waterTarget;
        });

        const daysList = Array.from(byDay.values());
        const divisor = Math.max(daysList.length, 1);
        const averageProtein = daysList.reduce((sum, day) => sum + day.protein, 0) / divisor;
        const averageCarbs = daysList.reduce((sum, day) => sum + day.carbs, 0) / divisor;
        const averageFats = daysList.reduce((sum, day) => sum + day.fats, 0) / divisor;

        const adherenceByDay = daysList.map((day) => {
            if (day.calories <= 0) {
                return 0;
            }

            const deltaRatio = Math.abs(day.calories - defaultTarget) / Math.max(defaultTarget, 1);
            return Math.max(0, 100 - deltaRatio * 100);
        });
        const adherenceScore =
            adherenceByDay.length > 0
                ? adherenceByDay.reduce((sum, score) => sum + score, 0) / adherenceByDay.length
                : 0;

        const sortedDays = Array.from(byDay.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
        let currentMealStreakDays = 0;
        for (const [, dayData] of sortedDays) {
            if (!dayData.mealLogged) {
                break;
            }
            currentMealStreakDays += 1;
        }

        const hydrationGoalDays = daysList.filter((day) => day.water >= day.waterTarget).length;
        const hydrationGoalRate = (hydrationGoalDays / divisor) * 100;

        return {
            averageProtein,
            averageCarbs,
            averageFats,
            adherenceScore,
            currentMealStreakDays,
            hydrationGoalRate,
            workoutsThisWeek: workouts.length,
        };
    } catch (error) {
        handleError(error, 'progressApi.getProgressInsights');
        throw error;
    }
}
