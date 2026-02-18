import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as plansApi from '../../services/api/plans';

export const DIET_KEYS = {
    all: ['diets'] as const,
    templates: ['diets', 'templates'] as const,
    active: (userId: string) => ['diets', 'active', userId] as const,
};

export function useDietTemplates() {
    return useQuery({
        queryKey: DIET_KEYS.templates,
        queryFn: plansApi.getDietTemplates,
    });
}

export function useActiveDiet(userId?: string) {
    return useQuery({
        queryKey: DIET_KEYS.active(userId || ''),
        queryFn: () => plansApi.getActiveUserDiet(userId || ''),
        enabled: !!userId,
    });
}

export function useDietMutations() {
    const queryClient = useQueryClient();

    const activateDiet = useMutation({
        mutationFn: ({ userId, dietId }: { userId: string; dietId: string }) =>
            plansApi.activateDiet(userId, dietId),
        onSuccess: (_, { userId }) => {
            queryClient.invalidateQueries({ queryKey: DIET_KEYS.active(userId) });
        },
    });

    return {
        activateDiet,
    };
}
