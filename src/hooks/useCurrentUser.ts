import { useEffect, useState } from 'react';
import { database } from '../database';
import User from '../database/models/User';
import { useUserStore } from '../store/userStore';

/**
 * Reactive hook to get the current user from WatermelonDB
 * Updates automatically when User record changes.
 */
export function useCurrentUser() {
    const activeUserId = useUserStore((state) => state.user?.id || null);
    const isUserStoreLoading = useUserStore((state) => state.isLoading);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isUserStoreLoading && !activeUserId) {
            setIsLoading(true);
            return;
        }

        if (!activeUserId) {
            setUser(null);
            setIsLoading(false);
            return;
        }

        const usersCollection = database.get<User>('users');
        const query = usersCollection.query();

        const subscription = query.observe().subscribe((users) => {
            const matchedUser = users.find((entry) => entry.id === activeUserId) || null;
            setUser(matchedUser);
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [activeUserId, isUserStoreLoading]);

    return { user, isLoading };
}
