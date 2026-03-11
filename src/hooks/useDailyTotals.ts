import { useMemo } from 'react';
import { useMeals } from '../query/queries/useMeals';

export interface DailyTotals {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
    sugar: number;
    mealCount: number;
}

const EMPTY_DAILY_TOTALS: DailyTotals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    fiber: 0,
    sugar: 0,
    mealCount: 0,
};

export function useDailyTotals(date: Date = new Date(), userId?: string) {
    const { data: meals, isLoading, error, refetch } = useMeals(date, userId);

    const dailyTotals = useMemo<DailyTotals>(() => {
        if (!meals || meals.length === 0) {
            return EMPTY_DAILY_TOTALS;
        }

        return meals.reduce<DailyTotals>(
            (totals, meal) => {
                totals.calories += meal.totalCalories;
                totals.protein += meal.totalProtein;
                totals.carbs += meal.totalCarbs;
                totals.fats += meal.totalFats;
                totals.fiber += meal.totalFiber ?? 0;
                totals.sugar += meal.totalSugar ?? 0;
                totals.mealCount += 1;
                return totals;
            },
            { ...EMPTY_DAILY_TOTALS, mealCount: 0 },
        );
    }, [meals]);

    return {
        dailyTotals,
        isLoading,
        error,
        refetch,
    };
}

export default useDailyTotals;
