import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AdaptationSuggestion,
    DayCalorieAdjustment,
    MealPrepPlan,
    SuggestedMeal,
    applyAdaptationSuggestion,
    buildMealPrepPlan,
    calculateDailyAdherence,
    getSuggestedMealsForToday,
    getAdjustedTargetsForDate,
    runWeeklyAdaptiveAnalysis,
} from '../services/dietPlan';
import { storage } from '../utils/storage-adapter';

interface UseDietPlanSuggestionsResult {
    suggestions: SuggestedMeal[];
    nextMeal: SuggestedMeal | null;
    adherenceScore: number;
    adaptationSuggestions: AdaptationSuggestion[];
    mealPrepPlan: MealPrepPlan | null;
    workoutAdjustment: DayCalorieAdjustment | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
    dismissSuggestion: (mealId: string) => void;
    applyAdaptation: (suggestion: AdaptationSuggestion) => Promise<void>;
}

const todayDateString = () => new Date().toISOString().slice(0, 10);
const dismissedKey = (mealId: string, day: string) => `dismissed_suggestion_${mealId}_${day}`;

export function useDietPlanSuggestions(userId: string | undefined): UseDietPlanSuggestionsResult {
    const queryClient = useQueryClient();
    const dateKey = todayDateString();

    const query = useQuery({
        queryKey: ['diet-suggestions', userId, dateKey],
        staleTime: 10 * 60 * 1000,
        enabled: Boolean(userId),
        queryFn: async () => {
            if (!userId) {
                return {
                    suggestions: [] as SuggestedMeal[],
                    adherenceScore: 0,
                    adaptationSuggestions: [] as AdaptationSuggestion[],
                    mealPrepPlan: null as MealPrepPlan | null,
                    workoutAdjustment: null as DayCalorieAdjustment | null,
                };
            }

            const [suggestions, adherenceScore, adaptiveResult, mealPrepPlan, workoutAdjustment] = await Promise.all([
                getSuggestedMealsForToday(userId),
                calculateDailyAdherence(userId, new Date()),
                runWeeklyAdaptiveAnalysis(userId),
                buildMealPrepPlan(userId),
                getAdjustedTargetsForDate(userId, new Date()),
            ]);

            const filteredSuggestions: SuggestedMeal[] = [];
            for (const suggestion of suggestions) {
                const dismissed = await storage.getItem(dismissedKey(suggestion.id, dateKey));
                if (!dismissed) {
                    filteredSuggestions.push(suggestion);
                }
            }

            return {
                suggestions: filteredSuggestions,
                adherenceScore,
                adaptationSuggestions: adaptiveResult.suggestions,
                mealPrepPlan,
                workoutAdjustment,
            };
        },
    });

    const refresh = () => {
        void queryClient.invalidateQueries({ queryKey: ['diet-suggestions', userId, dateKey] });
    };

    const dismissSuggestion = (mealId: string) => {
        if (!userId) return;

        void (async () => {
            await storage.setItem(dismissedKey(mealId, dateKey), String(Date.now()));
            await queryClient.invalidateQueries({ queryKey: ['diet-suggestions', userId, dateKey] });
        })();
    };

    const applyAdaptation = async (suggestion: AdaptationSuggestion) => {
        if (!userId) return;

        await applyAdaptationSuggestion(suggestion, userId);
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['diet-suggestions', userId] }),
            queryClient.invalidateQueries({ queryKey: ['meal-plans'] }),
        ]);
    };

    return useMemo(
        () => ({
            suggestions: query.data?.suggestions ?? [],
            nextMeal: query.data?.suggestions?.[0] ?? null,
            adherenceScore: query.data?.adherenceScore ?? 0,
            adaptationSuggestions: query.data?.adaptationSuggestions ?? [],
            mealPrepPlan: query.data?.mealPrepPlan ?? null,
            workoutAdjustment: query.data?.workoutAdjustment ?? null,
            isLoading: query.isLoading,
            error: query.error instanceof Error ? query.error.message : null,
            refresh,
            dismissSuggestion,
            applyAdaptation,
        }),
        [query.data, query.error, query.isLoading],
    );
}
