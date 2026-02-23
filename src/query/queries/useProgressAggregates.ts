import { useEffect, useMemo, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../database';
import Meal from '../../database/models/Meal';
import WaterLog from '../../database/models/WaterLog';

const DAY_MS = 24 * 60 * 60 * 1000;

export type ProgressAggregates = {
    totalMealsLogged: number;
    mealsThisWeek: number;
    currentStreak: number;
    averageCaloriesLast7Days: number;
    averageMacrosLast7Days: {
        protein: number;
        carbs: number;
        fats: number;
    };
    averageWaterLast7Days: number;
};

const EMPTY_AGGREGATES: ProgressAggregates = {
    totalMealsLogged: 0,
    mealsThisWeek: 0,
    currentStreak: 0,
    averageCaloriesLast7Days: 0,
    averageMacrosLast7Days: { protein: 0, carbs: 0, fats: 0 },
    averageWaterLast7Days: 0,
};

const getDayKey = (timestamp: number) => {
    const day = new Date(timestamp);
    day.setHours(0, 0, 0, 0);
    return day.getTime();
};

const getCurrentStreak = (timestamps: number[]) => {
    if (!timestamps.length) {
        return 0;
    }

    const uniqueDays = Array.from(new Set(timestamps.map(getDayKey))).sort((a, b) => b - a);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (uniqueDays[0] !== today.getTime()) {
        return 0;
    }

    let streak = 0;
    let expectedDay = today.getTime();

    for (const day of uniqueDays) {
        if (day !== expectedDay) {
            break;
        }

        streak += 1;
        expectedDay -= DAY_MS;
    }

    return streak;
};

export const calculateProgressAggregates = (mealLogs: Meal[], waterLogs: WaterLog[]): ProgressAggregates => {
    if (!mealLogs.length && !waterLogs.length) {
        return EMPTY_AGGREGATES;
    }

    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const sevenDayStart = now.getTime() - 6 * DAY_MS;

    const mealsLast7Days = mealLogs.filter((meal) => meal.consumedAt >= sevenDayStart);
    const mealsByDay = new Map<
        number,
        { calories: number; protein: number; carbs: number; fats: number; meals: number }
    >();

    for (const meal of mealsLast7Days) {
        const key = getDayKey(meal.consumedAt);
        const dayTotals = mealsByDay.get(key) || { calories: 0, protein: 0, carbs: 0, fats: 0, meals: 0 };
        dayTotals.calories += Number(meal.totalCalories) || 0;
        dayTotals.protein += Number(meal.totalProtein) || 0;
        dayTotals.carbs += Number(meal.totalCarbs) || 0;
        dayTotals.fats += Number(meal.totalFats) || 0;
        dayTotals.meals += 1;
        mealsByDay.set(key, dayTotals);
    }

    const waterLast7Days = waterLogs.filter((entry) => entry.loggedAt >= sevenDayStart);
    const waterByDay = new Map<number, number>();
    for (const waterEntry of waterLast7Days) {
        const key = getDayKey(waterEntry.loggedAt);
        waterByDay.set(key, (waterByDay.get(key) || 0) + (Number(waterEntry.amount) || 0));
    }

    const mealDaysCount = mealsByDay.size;
    const waterDaysCount = waterByDay.size;

    const macroSums = Array.from(mealsByDay.values()).reduce(
        (acc, day) => {
            acc.calories += day.calories;
            acc.protein += day.protein;
            acc.carbs += day.carbs;
            acc.fats += day.fats;
            return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fats: 0 },
    );

    const waterSum = Array.from(waterByDay.values()).reduce((sum, amount) => sum + amount, 0);

    return {
        totalMealsLogged: mealLogs.length,
        mealsThisWeek: mealsLast7Days.length,
        currentStreak: getCurrentStreak(mealLogs.map((meal) => meal.consumedAt)),
        averageCaloriesLast7Days: mealDaysCount ? Math.round(macroSums.calories / mealDaysCount) : 0,
        averageMacrosLast7Days: {
            protein: mealDaysCount ? Math.round(macroSums.protein / mealDaysCount) : 0,
            carbs: mealDaysCount ? Math.round(macroSums.carbs / mealDaysCount) : 0,
            fats: mealDaysCount ? Math.round(macroSums.fats / mealDaysCount) : 0,
        },
        averageWaterLast7Days: waterDaysCount ? Math.round(waterSum / waterDaysCount) : 0,
    };
};

export function useProgressAggregates(userId?: string) {
    const [meals, setMeals] = useState<Meal[] | undefined>(undefined);
    const [waterLogs, setWaterLogs] = useState<WaterLog[] | undefined>(undefined);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!userId) {
            setMeals([]);
            setWaterLogs([]);
            return;
        }

        const mealsQuery = database.get<Meal>('meals').query(Q.where('user_id', userId));
        const waterQuery = database.get<WaterLog>('water_logs').query(Q.where('user_id', userId));

        const mealSubscription = mealsQuery.observe().subscribe({
            next: (entries) => setMeals(entries),
            error: (subscriptionError) => setError(subscriptionError as Error),
        });

        const waterSubscription = waterQuery.observe().subscribe({
            next: (entries) => setWaterLogs(entries),
            error: (subscriptionError) => setError(subscriptionError as Error),
        });

        return () => {
            mealSubscription.unsubscribe();
            waterSubscription.unsubscribe();
        };
    }, [userId]);

    const aggregates = useMemo(() => calculateProgressAggregates(meals || [], waterLogs || []), [meals, waterLogs]);

    return {
        data: aggregates,
        isLoading: meals === undefined || waterLogs === undefined,
        error,
    };
}

export { EMPTY_AGGREGATES };
