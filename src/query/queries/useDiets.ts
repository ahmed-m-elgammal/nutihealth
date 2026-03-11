import { useQuery } from '@tanstack/react-query';
import * as plansApi from '../../services/api/plans';
import { DIET_KEYS } from '../dietKeys';

export { DIET_KEYS };

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
