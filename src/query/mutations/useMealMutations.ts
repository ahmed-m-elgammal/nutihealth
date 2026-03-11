import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createMeal as createMealApi, deleteMeal as deleteMealApi, MealData, updateMeal as updateMealApi } from '../../services/api/meals';
import Meal from '../../database/models/Meal';

const MEAL_QUERY_KEY = ['meals'] as const;

export const useMealMutations = () => {
    const queryClient = useQueryClient();

    const createMeal = useMutation({
        mutationFn: createMealApi,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: MEAL_QUERY_KEY }),
    });

    const updateMeal = useMutation({
        mutationFn: ({ mealId, updates }: { mealId: string; updates: Partial<MealData> }) => updateMealApi(mealId, updates),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: MEAL_QUERY_KEY }),
    });

    const deleteMeal = useMutation({
        mutationFn: deleteMealApi,
        // Optimistic update: remove from cache immediately for instant UI feedback
        onMutate: async (mealId: string) => {
            await queryClient.cancelQueries({ queryKey: MEAL_QUERY_KEY });
            const previousMeals = queryClient.getQueryData(MEAL_QUERY_KEY);
            queryClient.setQueriesData(
                { queryKey: MEAL_QUERY_KEY },
                (old: Meal[] | undefined) => old?.filter((m) => m.id !== mealId) ?? [],
            );
            return { previousMeals };
        },
        // Rollback on error
        onError: (_err, _mealId, context) => {
            if (context?.previousMeals) {
                queryClient.setQueryData(MEAL_QUERY_KEY, context.previousMeals);
            }
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: MEAL_QUERY_KEY }),
    });

    return {
        createMeal: async (mealData: MealData) => createMeal.mutateAsync(mealData),
        updateMeal: async (mealId: string, updates: Partial<MealData>) => updateMeal.mutateAsync({ mealId, updates }),
        deleteMeal: async (mealId: string) => deleteMeal.mutateAsync(mealId),
        createMealMutation: createMeal,
        updateMealMutation: updateMeal,
        deleteMealMutation: deleteMeal,
    };
};
