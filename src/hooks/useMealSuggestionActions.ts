import { useCallback } from 'react';
import { triggerHaptic } from '../utils/haptics';

type MealActionHandler = () => void | Promise<void>;

interface MealSuggestionActionsOptions {
    onLogMeal: MealActionHandler;
    onDismiss: MealActionHandler;
    onSmartCooker?: MealActionHandler;
}

const runAction = (handler?: MealActionHandler) => {
    if (!handler) {
        return;
    }

    Promise.resolve(handler()).catch(() => undefined);
};

export function useMealSuggestionActions({
    onLogMeal,
    onDismiss,
    onSmartCooker,
}: MealSuggestionActionsOptions) {
    const handleLogMeal = useCallback(() => {
        triggerHaptic('medium').catch(() => undefined);
        runAction(onLogMeal);
    }, [onLogMeal]);

    const handleDismiss = useCallback(() => {
        triggerHaptic('light').catch(() => undefined);
        runAction(onDismiss);
    }, [onDismiss]);

    const handleSmartCooker = useCallback(() => {
        if (!onSmartCooker) {
            return;
        }

        triggerHaptic('medium').catch(() => undefined);
        runAction(onSmartCooker);
    }, [onSmartCooker]);

    return {
        handleLogMeal,
        handleDismiss,
        handleSmartCooker,
    };
}

export default useMealSuggestionActions;