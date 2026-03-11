import { useMutation } from '@tanstack/react-query';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import SmartCookerSuggestion from '../../database/models/SmartCookerSuggestion';
import { useCurrentUser } from '../../hooks/useCurrentUser';

export type SmartCookerAction = 'viewed' | 'cooked' | 'saved' | 'dismissed';

export interface SuggestionFeedbackInput {
    sessionId?: string | null;
    cookpadRecipeId: string;
    action: SmartCookerAction;
    pantryItemIds?: string[];
    suggestedRecipeIds?: string[];
    confidenceScore?: number;
    metadata?: Record<string, unknown>;
}

export function useSuggestionFeedback() {
    const database = useDatabase();
    const { user } = useCurrentUser();

    const mutation = useMutation({
        mutationFn: async (input: SuggestionFeedbackInput) => {
            if (!user?.id) {
                throw new Error('No active user found.');
            }

            const now = Date.now();
            const recipeIds = input.suggestedRecipeIds?.length ? input.suggestedRecipeIds : [input.cookpadRecipeId];

            return database.write(async () => {
                return database.get<SmartCookerSuggestion>('smart_cooker_suggestions').create((record) => {
                    record.userId = user.id;
                    record.pantryItemIds = input.pantryItemIds || [];
                    record.suggestedRecipeIds = recipeIds;
                    record.sourcePlatform = 'cookpad';
                    record.confidenceScore = input.confidenceScore;
                    record.status = input.action;
                    record.metadata = {
                        ...(input.metadata || {}),
                        action_at: now,
                        cookpad_recipe_id: input.cookpadRecipeId,
                        session_id: input.sessionId || null,
                    };
                });
            });
        },
    });

    return {
        recordSuggestionAction: (input: SuggestionFeedbackInput) => mutation.mutateAsync(input),
        suggestionFeedbackMutation: mutation,
    };
}

export default useSuggestionFeedback;
