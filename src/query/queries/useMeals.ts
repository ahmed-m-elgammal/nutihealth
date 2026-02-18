import { useEffect, useMemo, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../database';
import Meal from '../../database/models/Meal';
import type { NutritionSummary } from '../../services/api/meals';

interface ObservableQueryResult<T> {
    data: T | undefined;
    isLoading: boolean;
    error: Error | null;
}

const EMPTY_SUMMARY: NutritionSummary = {
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFats: 0,
    totalFiber: 0,
    totalSugar: 0,
    mealCount: 0,
};

const toDayWindow = (date: Date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return { startMs: start.getTime(), endMs: end.getTime() };
};

export function useMeals(date: Date = new Date()) {
    const dateKey = date.toISOString().split('T')[0];
    const [data, setData] = useState<Meal[] | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const { startMs, endMs } = toDayWindow(date);
        const mealsQuery = database
            .get<Meal>('meals')
            .query(
                Q.where('consumed_at', Q.gte(startMs)),
                Q.where('consumed_at', Q.lte(endMs)),
                Q.sortBy('consumed_at', Q.desc)
            );

        setIsLoading(true);
        setError(null);

        const subscription = mealsQuery.observe().subscribe({
            next: (meals) => {
                setData(meals);
                setIsLoading(false);
            },
            error: (subscriptionError) => {
                setError(subscriptionError as Error);
                setIsLoading(false);
            },
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [dateKey]);

    return { data, isLoading, error } as ObservableQueryResult<Meal[]>;
}

export function useDailyNutrition(date: Date = new Date()) {
    const { data: meals, isLoading, error } = useMeals(date);

    const summary = useMemo(() => {
        if (!meals || meals.length === 0) {
            return EMPTY_SUMMARY;
        }

        return meals.reduce<NutritionSummary>(
            (acc, meal) => {
                acc.totalCalories += meal.totalCalories;
                acc.totalProtein += meal.totalProtein;
                acc.totalCarbs += meal.totalCarbs;
                acc.totalFats += meal.totalFats;
                acc.mealCount += 1;
                return acc;
            },
            {
                ...EMPTY_SUMMARY,
                mealCount: 0,
            }
        );
    }, [meals]);

    return {
        data: isLoading ? undefined : summary,
        isLoading,
        error,
    } as ObservableQueryResult<NutritionSummary>;
}
