import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import {
    addPantryItem as addPantryItemApi,
    markPantryItemsUsed,
    removePantryItem as removePantryItemApi,
    type PantryCategory,
    type PantryUnit,
} from '../../services/api/pantry';

export interface AddPantryItemPayload {
    name: string;
    quantity: number;
    unit: PantryUnit;
    category?: Exclude<PantryCategory, 'all'>;
    expiryDate?: number;
}

export function usePantryMutations() {
    const queryClient = useQueryClient();
    const { user } = useCurrentUser();
    const pantryQueryPrefix = ['pantry', user?.id || 'anonymous'];

    const invalidatePantry = () => queryClient.invalidateQueries({ queryKey: pantryQueryPrefix });

    const addPantryItem = useMutation({
        mutationFn: async (payload: AddPantryItemPayload) => {
            return addPantryItemApi({
                ...payload,
                userId: user?.id,
            });
        },
        onSuccess: invalidatePantry,
    });

    const markUnavailable = useMutation({
        mutationFn: async (itemId: string) => {
            await removePantryItemApi(itemId);
        },
        onSuccess: invalidatePantry,
    });

    const bulkDelete = useMutation({
        mutationFn: async (itemIds: string[]) => {
            if (!Array.isArray(itemIds) || itemIds.length === 0) {
                return;
            }

            await markPantryItemsUsed(itemIds);
        },
        onSuccess: invalidatePantry,
    });

    return {
        addPantryItem: (payload: AddPantryItemPayload) => addPantryItem.mutateAsync(payload),
        removePantryItem: (itemId: string) => markUnavailable.mutateAsync(itemId),
        markItemUsed: (itemId: string) => markUnavailable.mutateAsync(itemId),
        bulkDelete: (itemIds: string[]) => bulkDelete.mutateAsync(itemIds),
    };
}

export default usePantryMutations;
