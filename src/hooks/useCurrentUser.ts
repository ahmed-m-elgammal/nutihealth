import { useState, useEffect } from 'react';
import { database } from '../database';
import User from '../database/models/User';
import { getUserId } from '../utils/storage';

/**
 * Reactive hook to get the current user from WatermelonDB
 * Updates automatically when User record changes.
 */
export function useCurrentUser() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [storedUserId, setStoredUserId] = useState<string | null>(null);
    const [isUserIdResolved, setIsUserIdResolved] = useState(false);

    useEffect(() => {
        let isActive = true;

        const resolveUserId = async () => {
            try {
                const userId = await getUserId();
                if (isActive) {
                    setStoredUserId(userId || null);
                }
            } finally {
                if (isActive) {
                    setIsUserIdResolved(true);
                }
            }
        };

        resolveUserId().catch(() => {
            if (isActive) {
                setIsUserIdResolved(true);
            }
        });

        return () => {
            isActive = false;
        };
    }, []);

    useEffect(() => {
        if (!isUserIdResolved) {
            return;
        }

        const usersCollection = database.get<User>('users');
        const query = usersCollection.query();

        const subscription = query.observe().subscribe((users) => {
            if (storedUserId) {
                const matchedUser = users.find((entry) => entry.id === storedUserId) || null;
                if (matchedUser) {
                    setUser(matchedUser);
                } else {
                    // If auth/storage IDs drift in local dev, only allow a safe single-user fallback.
                    setUser(users.length === 1 ? users[0] : null);
                }
            } else {
                // Avoid cross-user leakage: only use fallback when a single local user exists.
                setUser(users.length === 1 ? users[0] : null);
            }
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [isUserIdResolved, storedUserId]);

    return { user, isLoading };
}
