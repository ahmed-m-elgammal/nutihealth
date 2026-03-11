import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    suggestSmartCookerRecipes,
    type SmartCookerSuggestRequest,
    type SmartCookerSuggestResponse,
} from '../../services/api/smartCooker';

interface UseSmartCookerSuggestionsOptions {
    enabled?: boolean;
}

export function useSmartCookerSuggestions(
    request: SmartCookerSuggestRequest | null,
    options: UseSmartCookerSuggestionsOptions = {},
) {
    const serializedRequest = useMemo(() => (request ? JSON.stringify(request) : ''), [request]);
    const enabled = Boolean(request) && (options.enabled ?? true);

    return useQuery<SmartCookerSuggestResponse>({
        queryKey: ['smart-cooker-suggestions', serializedRequest],
        enabled,
        queryFn: async () => {
            if (!request) {
                return {
                    session_id: '',
                    suggestions: [],
                    meta: {
                        total_candidates: 0,
                        total_suggestions: 0,
                        strictness: 'flexible',
                        meal_type: 'lunch',
                        remaining_budget: 0,
                    },
                };
            }

            return suggestSmartCookerRecipes(request);
        },
        staleTime: 1000 * 60 * 5,
    });
}

export default useSmartCookerSuggestions;
