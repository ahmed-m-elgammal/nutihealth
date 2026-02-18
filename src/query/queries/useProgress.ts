import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as progressApi from '../../services/api/progress';

export const PROGRESS_KEYS = {
    all: ['progress'] as const,
    weight: (userId: string) => ['progress', 'weight', userId] as const,
    calories: (userId: string) => ['progress', 'calories', userId] as const,
    insights: (userId: string) => ['progress', 'insights', userId] as const,
};

export function useWeightHistory(userId?: string) {
    return useQuery({
        queryKey: PROGRESS_KEYS.weight(userId || ''),
        queryFn: () => progressApi.getWeightHistory(userId || ''),
        enabled: !!userId,
    });
}

export function useCalorieHistory(userId?: string) {
    return useQuery({
        queryKey: PROGRESS_KEYS.calories(userId || ''),
        queryFn: () => progressApi.getCalorieHistory(userId || ''),
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
            queryClient.invalidateQueries({ queryKey: PROGRESS_KEYS.weight(userId) });
            // Also invalidate user queries since weight is updated on user profile
            queryClient.invalidateQueries({ queryKey: ['user'] });
        },
    });

    return {
        logWeight,
    };
}
