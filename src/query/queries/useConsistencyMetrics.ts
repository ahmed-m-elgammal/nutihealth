import { useQuery } from '@tanstack/react-query';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../database';
import Meal from '../../database/models/Meal';

const DAY_MS = 24 * 60 * 60 * 1000;

const dayStart = (timestamp: number) => {
    const d = new Date(timestamp);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
};

export type ConsistencyMetrics = {
    weeklyOnTargetPercentage: number;
    daysOnTarget: number;
    weeklyDaysConsidered: number;
    current30DayMealStreak: number;
};

const EMPTY: ConsistencyMetrics = {
    weeklyOnTargetPercentage: 0,
    daysOnTarget: 0,
    weeklyDaysConsidered: 7,
    current30DayMealStreak: 0,
};

export function useConsistencyMetrics(userId?: string, calorieTarget: number = 0) {
    return useQuery({
        queryKey: ['consistency-metrics', userId, calorieTarget],
        enabled: Boolean(userId),
        staleTime: 60 * 60 * 1000,
        queryFn: async (): Promise<ConsistencyMetrics> => {
            if (!userId || calorieTarget <= 0) return EMPTY;

            const today = dayStart(Date.now());
            const start30 = today - 29 * DAY_MS;
            const endToday = today + DAY_MS - 1;

            const meals = await database
                .get<Meal>('meals')
                .query(Q.where('user_id', userId), Q.where('consumed_at', Q.between(start30, endToday)))
                .fetch();

            const caloriesByDay = new Map<number, number>();
            meals.forEach((meal) => {
                const key = dayStart(meal.consumedAt);
                caloriesByDay.set(key, (caloriesByDay.get(key) || 0) + (Number(meal.totalCalories) || 0));
            });

            const tolerance = calorieTarget * 0.1;
            const weeklyStart = today - 6 * DAY_MS;
            let daysOnTarget = 0;

            for (let day = weeklyStart; day <= today; day += DAY_MS) {
                const total = caloriesByDay.get(day) || 0;
                if (total > 0 && Math.abs(total - calorieTarget) <= tolerance) {
                    daysOnTarget += 1;
                }
            }

            let currentStreak = 0;
            for (let day = today; day >= start30; day -= DAY_MS) {
                const total = caloriesByDay.get(day) || 0;
                if (total > 0) {
                    currentStreak += 1;
                } else {
                    break;
                }
            }

            return {
                weeklyOnTargetPercentage: Math.round((daysOnTarget / 7) * 100),
                daysOnTarget,
                weeklyDaysConsidered: 7,
                current30DayMealStreak: currentStreak,
            };
        },
    });
}
