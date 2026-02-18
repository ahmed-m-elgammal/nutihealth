import { database } from '../../database';
import Workout from '../../database/models/Workout';
import Exercise from '../../database/models/Exercise';
import WorkoutExercise from '../../database/models/WorkoutExercise';
import ExerciseSet from '../../database/models/ExerciseSet';
import { Q } from '@nozbe/watermelondb';
import { handleError } from '../../utils/errors';

export interface CreateWorkoutParams {
    userId: string;
    name: string;
    startedAt: number;
    endedAt?: number;
    notes?: string;
    isPlanned?: boolean; // New flag
    exercises: {
        exerciseId: string;
        name?: string;
        sets: {
            reps: number;
            weight: number;
            duration?: number;
            distance?: number;
        }[];
    }[];
}

const resolveExerciseId = async (
    collection: ReturnType<typeof database.get<Exercise>>,
    userId: string,
    exerciseId: string,
    name?: string
): Promise<string> => {
    const trimmedName = name?.trim();
    const hasPlaceholderId = !exerciseId || /^exerc_/i.test(exerciseId);

    if (!hasPlaceholderId) {
        try {
            await collection.find(exerciseId);
            return exerciseId;
        } catch {
            // Fall through to name-based lookup/creation.
        }
    }

    if (!trimmedName) {
        throw new Error('Exercise is missing a valid ID and name.');
    }

    const existing = await collection
        .query(Q.where('name', trimmedName))
        .fetch();

    if (existing.length > 0) {
        return existing[0].id;
    }

    const created = await collection.create((exercise) => {
        exercise.name = trimmedName;
        exercise.category = 'strength';
        exercise.muscleGroup = 'full_body';
        exercise.equipment = 'bodyweight';
        exercise.isCustom = true;
        exercise.userId = userId;
    });

    return created.id;
};

/**
 * Log a complete workout or schedule a planned one
 */
export async function logWorkout(params: CreateWorkoutParams): Promise<Workout> {
    try {
        let workout: Workout | null = null;
        const isPlanned = params.isPlanned || false;

        await database.write(async () => {
            const workoutsCollection = database.get<Workout>('workouts');
            const exercisesCollection = database.get<Exercise>('exercises');
            const workoutExercisesCollection = database.get<WorkoutExercise>('workout_exercises');
            const exerciseSetsCollection = database.get<ExerciseSet>('exercise_sets');

            // 1. Create Workout
            workout = await workoutsCollection.create(w => {
                w.userId = params.userId;
                w.name = params.name;
                w.startedAt = params.startedAt;
                if (params.endedAt) w.endedAt = params.endedAt;
                w.notes = params.notes;
                w.workoutType = 'strength'; // Default
                w.duration = params.endedAt ? (params.endedAt - params.startedAt) / 60000 : 0;
            });

            // 2. Add Exercises and Sets
            for (const [exerciseIndex, exData] of params.exercises.entries()) {
                const resolvedExerciseId = await resolveExerciseId(
                    exercisesCollection,
                    params.userId,
                    exData.exerciseId,
                    exData.name
                );

                const workoutExercise = await workoutExercisesCollection.create(we => {
                    we.workoutId = workout!.id;
                    we.exerciseId = resolvedExerciseId;
                    we.order = exerciseIndex;
                });

                for (const [setIndex, setData] of exData.sets.entries()) {
                    await exerciseSetsCollection.create(s => {
                        s.workoutExerciseId = workoutExercise.id;
                        s.setNumber = setIndex + 1;
                        s.reps = setData.reps;
                        s.weight = setData.weight;
                        if (setData.duration) s.duration = setData.duration;
                        if (setData.distance) s.distance = setData.distance;
                        s.isWarmup = false;
                        s.isPr = false;
                        s.isCompleted = !isPlanned; // False if scheduling
                    });
                }
            }
        });

        return workout!;
    } catch (error) {
        handleError(error, 'workoutsApi.logWorkout');
        throw error;
    }
}

/**
 * Fetch recent workouts for a user (most recent first).
 * Limited to 20 to keep UI performant.
 */
export async function getWorkoutHistory(userId: string): Promise<Workout[]> {
    if (!userId) return [];

    try {
        const workouts = await database.collections
            .get<Workout>('workouts')
            .query(
                Q.where('user_id', userId),
                Q.sortBy('started_at', Q.desc),
                Q.take(20)
            )
            .fetch();

        return workouts;
    } catch (error) {
        handleError(error, 'workoutsApi.getWorkoutHistory');
        return [];
    }
}
