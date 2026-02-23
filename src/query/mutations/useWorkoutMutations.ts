import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import Workout from '../../database/models/Workout';
import { WorkoutSession } from '../../types/workout';
import { logWorkout } from '../../services/api/workouts';

const WORKOUT_QUERY_KEY = ['workouts'] as const;

export const useWorkoutMutations = () => {
    const database = useDatabase();
    const queryClient = useQueryClient();

    const createWorkout = useMutation({
        mutationFn: async ({
            session,
            userId = 'user_default',
            workoutName = 'Quick Workout',
        }: {
            session: WorkoutSession;
            userId?: string;
            workoutName?: string;
        }) => {
            return logWorkout({
                userId,
                name: workoutName,
                startedAt: session.date,
                endedAt: session.date + session.duration * 60 * 1000,
                notes: session.notes,
                exercises: session.exercises.map((exercise) => ({
                    exerciseId: exercise.exerciseId,
                    sets: exercise.sets.map((setData) => ({
                        reps: setData.actualReps || 0,
                        weight: setData.weight || 0,
                    })),
                })),
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: WORKOUT_QUERY_KEY }),
    });

    const deleteWorkout = useMutation({
        mutationFn: async (workoutId: string) => {
            await database.write(async () => {
                const workout = await database.get<Workout>('workouts').find(workoutId);
                await workout.destroyPermanently();
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: WORKOUT_QUERY_KEY }),
    });

    return {
        createWorkout: async (session: WorkoutSession, userId?: string, workoutName?: string) =>
            createWorkout.mutateAsync({ session, userId, workoutName }),
        deleteWorkout: async (workoutId: string) => deleteWorkout.mutateAsync(workoutId),
        createWorkoutMutation: createWorkout,
        deleteWorkoutMutation: deleteWorkout,
    };
};
