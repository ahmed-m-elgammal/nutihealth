import { useQuery } from '@tanstack/react-query';
import PantryItem from '../../database/models/PantryItem';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { getPantryItems, type PantryCategory } from '../../services/api/pantry';

export function usePantryItems(category: PantryCategory = 'all') {
    const { user } = useCurrentUser();

    return useQuery({
        queryKey: ['pantry', user?.id || 'anonymous', category],
        enabled: Boolean(user?.id),
        queryFn: (): Promise<PantryItem[]> =>
            getPantryItems({
                userId: user?.id,
                category,
                includeUnavailable: false,
            }),
    });
}

export default usePantryItems;
