import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as progressApi from '../../services/api/progress';

export const PROGRESS_KEYS = {
    all: ['progress'] as const,
    weight: (userId: string, limit: number) => ['progress', 'weight', userId, limit] as const,
    calories: (userId: string, days: number) => ['progress', 'calories', userId, days] as const,
    macros: (userId: string, days: number) => ['progress', 'macros', userId, days] as const,
    insights: (userId: string) => ['progress', 'insights', userId] as const,
};

export function useWeightHistory(userId?: string, limit: number = 30) {
    return useQuery({
        queryKey: PROGRESS_KEYS.weight(userId || '', limit),
        queryFn: () => progressApi.getWeightHistory(userId || '', limit),
        enabled: !!userId,
    });
}

export function useCalorieHistory(userId?: string, days: number = 7) {
    return useQuery({
        queryKey: PROGRESS_KEYS.calories(userId || '', days),
        queryFn: () => progressApi.getCalorieHistory(userId || '', days),
        enabled: !!userId,
    });
}

export function useMacroHistory(userId?: string, days: number = 7) {
    return useQuery({
        queryKey: PROGRESS_KEYS.macros(userId || '', days),
        queryFn: () => progressApi.getMacroHistory(userId || '', days),
        enabled: !!userId,
    });
}

export function useProgressInsights(userId?: string) {
    return useQuery({
        queryKey: PROGRESS_KEYS.insights(userId || ''),
        queryFn: () => progressApi.getProgressInsights(userId || ''),
        enabled: !!userId,
    });
}

export function useProgressMutations() {
    const queryClient = useQueryClient();

    const logWeight = useMutation({
        mutationFn: ({ userId, weight }: { userId: string; weight: number }) => progressApi.logWeight(userId, weight),
        onSuccess: (_, { userId }) => {
            queryClient.invalidateQueries({ queryKey: ['progress', 'weight', userId] });
            // Also invalidate user queries since weight is updated on user profile
            queryClient.invalidateQueries({ queryKey: ['user'] });
        },
    });

    return {
        logWeight,
    };
}
