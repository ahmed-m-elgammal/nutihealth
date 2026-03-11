import { useCallback } from 'react';
import useSmartCookerStore from '../../store/smartCookerStore';
import type { SuggestionAction } from '../../store/smartCookerStore';
import { useSuggestionFeedback } from './useSuggestionFeedback';

/**
 * Hook that bridges the Smart Cooker store's pending actions
 * to the database-backed suggestion feedback system.
 *
 * Call `flushPendingActions()` when leaving the Smart Cooker modal
 * or after the user finishes a "Cook Now" flow. This persists all
 * queued actions to the local database for future learning-loop use.
 */
export function useSmartCookerActions() {
    const flushActions = useSmartCookerStore((state) => state.flushActions);
    const sessionId = useSmartCookerStore((state) => state.sessionId);
    const recordAction = useSmartCookerStore((state) => state.recordAction);
    const { recordSuggestionAction } = useSuggestionFeedback();

    const flushPendingActions = useCallback(async () => {
        const actions = flushActions();
        if (actions.length === 0) return;

        for (const action of actions) {
            try {
                await recordSuggestionAction({
                    cookpadRecipeId: action.recipeId,
                    action: action.action,
                    sessionId: sessionId || undefined,
                });
            } catch {
                // Silently drop failed feedback — non-critical
                console.warn(`Failed to persist action ${action.action} for recipe ${action.recipeId}`);
            }
        }
    }, [flushActions, sessionId, recordSuggestionAction]);

    return {
        /** Queue an action (stored in-memory until flushed) */
        recordAction,
        /** Persist all queued actions to database */
        flushPendingActions,
    };
}

export type { SuggestionAction };
