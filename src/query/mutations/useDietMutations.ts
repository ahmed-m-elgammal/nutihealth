import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as plansApi from '../../services/api/plans';
import { DIET_KEYS } from '../dietKeys';

export const useDietMutations = () => {
    const queryClient = useQueryClient();

    const createCustomDiet = useMutation({
        mutationFn: plansApi.createCustomDiet,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: DIET_KEYS.all });
            queryClient.invalidateQueries({ queryKey: DIET_KEYS.templates });
        },
    });

    const activateDiet = useMutation({
        mutationFn: ({ userId, dietId }: { userId: string; dietId: string }) => plansApi.activateDiet(userId, dietId),
        onSuccess: (_, { userId }) => {
            queryClient.invalidateQueries({ queryKey: DIET_KEYS.active(userId) });
        },
    });

    return {
        createCustomDiet: (dietData: Parameters<typeof plansApi.createCustomDiet>[0]) =>
            createCustomDiet.mutateAsync(dietData),
        activateDiet: (userId: string, dietId: string) => activateDiet.mutateAsync({ userId, dietId }),
        createCustomDietMutation: createCustomDiet,
        activateDietMutation: activateDiet,
    };
};
