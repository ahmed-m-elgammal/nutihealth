import { useQuery } from '@tanstack/react-query';
import Workout from '../../database/models/Workout';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { getWorkoutById, getWorkoutHistory } from '../../services/api/workouts';

export const useWorkouts = (userId?: string) => {
    const { user } = useCurrentUser();
    const activeUserId = userId || user?.id;

    const query = useQuery<Workout[], Error>({
        queryKey: ['workouts', activeUserId || 'anonymous'],
        enabled: Boolean(activeUserId),
        queryFn: () => getWorkoutHistory(activeUserId || ''),
        placeholderData: (previous) => previous ?? [],
    });

    return {
        workouts: query.data || [],
        isLoading: query.isLoading,
        error: query.error ?? null,
        refetch: query.refetch,
    };
};

export const useWorkout = (id: string) => {
    const query = useQuery<Workout | null, Error>({
        queryKey: ['workouts', 'detail', id],
        enabled: Boolean(id),
        queryFn: () => getWorkoutById(id),
    });

    return {
        workout: query.data ?? null,
        loading: query.isLoading,
        error: query.error ?? null,
    };
};