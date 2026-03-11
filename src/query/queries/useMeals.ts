import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Meal from '../../database/models/Meal';
import { getMealsForDate, type NutritionSummary } from '../../services/api/meals';

interface ObservableQueryResult<T> {
    data: T | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch?: () => Promise<void>;
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

const toDateKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

export function useMeals(date: Date = new Date(), userId?: string) {
    const dateKey = toDateKey(date);
    const queryDate = useMemo(() => new Date(date.getFullYear(), date.getMonth(), date.getDate()), [dateKey]);

    const query = useQuery<Meal[], Error>({
        queryKey: ['meals', userId || 'anonymous', dateKey],
        enabled: Boolean(userId),
        queryFn: () => getMealsForDate(queryDate, userId),
        placeholderData: (previous) => previous ?? [],
    });

    return {
        data: query.data,
        isLoading: query.isLoading,
        error: query.error ?? null,
        refetch: async () => {
            await query.refetch();
        },
    } as ObservableQueryResult<Meal[]>;
}

export function useDailyNutrition(date: Date = new Date(), userId?: string) {
    const { data: meals, isLoading, error } = useMeals(date, userId);

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
                acc.totalFiber += meal.totalFiber ?? 0;
                acc.totalSugar += meal.totalSugar ?? 0;
                acc.mealCount += 1;
                return acc;
            },
            {
                ...EMPTY_SUMMARY,
                mealCount: 0,
            },
        );
    }, [meals]);

    return {
        data: isLoading ? undefined : summary,
        isLoading,
        error,
    } as ObservableQueryResult<NutritionSummary>;
}
