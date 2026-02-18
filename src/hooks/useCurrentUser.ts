import { useState, useEffect } from 'react';
import { database } from '../database';
import User from '../database/models/User';

/**
 * Reactive hook to get the current user from WatermelonDB
 * Updates automatically when User record changes.
 */
export function useCurrentUser() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const usersCollection = database.get<User>('users');
        const query = usersCollection.query();

        const subscription = query.observe().subscribe(users => {
            setUser(users.length > 0 ? users[0] : null);
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    return { user, isLoading };
}
