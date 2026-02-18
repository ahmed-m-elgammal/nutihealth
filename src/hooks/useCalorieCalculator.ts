import { useMemo } from 'react';
import { useDatabase } from './useDatabase';
import { getStartOfDay, getEndOfDay } from '../utils/formatters/date';
import Meal from '../database/models/Meal';
import { useQuery } from '@tanstack/react-query';
import { Q } from '@nozbe/watermelondb';

/**
 * Hook for calculating daily calorie and macro consumption
 * @param date - Optional date (defaults to today)
 * @returns Calorie and macro calculations
 */
export function useCalorieCalculator(date?: Date) {
    const db = useDatabase();
    const targetDate = date || new Date();

    // Query today's meals
    const { data: meals = [], isLoading } = useQuery({
        queryKey: ['meals', targetDate.toDateString()],
        queryFn: async () => {
            const startOfDay = getStartOfDay(targetDate);
            const endOfDay = getEndOfDay(targetDate);

            const mealsCollection = db.get<Meal>('meals');
            const todaysMeals = await mealsCollection
                .query(
                    Q.where('consumed_at', Q.gte(startOfDay)),
                    Q.where('consumed_at', Q.lte(endOfDay))
                )
                .fetch();

            return todaysMeals;
        },
    });

    // Calculate totals
    const calculations = useMemo(() => {
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFats = 0;

        // Aggregate from meals
        meals.forEach(meal => {
            totalCalories += meal.totalCalories || 0;
            totalProtein += meal.totalProtein || 0;
            totalCarbs += meal.totalCarbs || 0;
            totalFats += meal.totalFats || 0;
        });

        return {
            totalCalories: Math.round(totalCalories),
            totalProtein: Math.round(totalProtein),
            totalCarbs: Math.round(totalCarbs),
            totalFats: Math.round(totalFats),
            mealCount: meals.length,
        };
    }, [meals]);

    /**
     * Calculate remaining calories/macros against user targets
     */
    const calculateRemaining = (
        calorieTarget: number,
        proteinTarget: number,
        carbsTarget: number,
        fatsTarget: number
    ) => {
        return {
            caloriesRemaining: calorieTarget - calculations.totalCalories,
            proteinRemaining: proteinTarget - calculations.totalProtein,
            carbsRemaining: carbsTarget - calculations.totalCarbs,
            fatsRemaining: fatsTarget - calculations.totalFats,
        };
    };

    /**
     * Calculate progress percentages
     */
    const calculateProgress = (
        calorieTarget: number,
        proteinTarget: number,
        carbsTarget: number,
        fatsTarget: number
    ) => {
        return {
            caloriesProgress: calorieTarget > 0 ? (calculations.totalCalories / calorieTarget) * 100 : 0,
            proteinProgress: proteinTarget > 0 ? (calculations.totalProtein / proteinTarget) * 100 : 0,
            carbsProgress: carbsTarget > 0 ? (calculations.totalCarbs / carbsTarget) * 100 : 0,
            fatsProgress: fatsTarget > 0 ? (calculations.totalFats / fatsTarget) * 100 : 0,
        };
    };

    /**
     * Get meals grouped by meal type
     */
    const getMealsByType = () => {
        const grouped: Record<string, typeof meals> = {
            breakfast: [],
            lunch: [],
            dinner: [],
            snack: [],
        };

        meals.forEach(meal => {
            const type = meal.mealType;
            if (grouped[type]) {
                grouped[type].push(meal);
            }
        });

        return grouped;
    };

    /**
     * Calculate calories for a specific meal type
     */
    const getCaloriesByMealType = (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'): number => {
        return meals
            .filter(meal => meal.mealType === mealType)
            .reduce((sum, meal) => sum + (meal.totalCalories || 0), 0);
    };

    return {
        ...calculations,
        isLoading,
        meals,
        calculateRemaining,
        calculateProgress,
        getMealsByType,
        getCaloriesByMealType,
    };
}

export default useCalorieCalculator;
