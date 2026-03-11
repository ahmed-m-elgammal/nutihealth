import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '../database';
import User from '../database/models/User';
import { useAuthSessionStore } from '../store/authSessionStore';
import { getUserId } from '../utils/storage';

export function useCurrentUser() {
    const sessionUserId = useAuthSessionStore((state) => state.userId);
    const [resolvedUserId, setResolvedUserId] = useState<string | null>(sessionUserId);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (sessionUserId) {
            setResolvedUserId(sessionUserId);
            return;
        }

        getUserId()
            .then((storedUserId) => {
                setResolvedUserId(storedUserId || null);
            })
            .finally(() => setIsLoading(false));
    }, [sessionUserId]);

    useEffect(() => {
        if (!resolvedUserId) {
            setUser(null);
            setIsLoading(false);
            return;
        }

        const usersCollection = database.get<User>('users');
        const subscription = usersCollection
            .query(Q.where('id', resolvedUserId))
            .observe()
            .subscribe((users) => {
                setUser(users[0] ?? null);
                setIsLoading(false);
            });

        return () => subscription.unsubscribe();
    }, [resolvedUserId]);

    return { user, isLoading };
}
