import { useDatabase } from '@nozbe/watermelondb/hooks';
import Workout from '../../database/models/Workout';
import WorkoutExercise from '../../database/models/WorkoutExercise';
import ExerciseSet from '../../database/models/ExerciseSet';
import { WorkoutSession } from '../../types/workout';

export const useWorkoutMutations = () => {
    const database = useDatabase();

    const createWorkout = async (session: WorkoutSession, userId: string = 'user_default', workoutName: string = 'Quick Workout') => {
        await database.write(async () => {
            // 1. Create Workout Record
            const workout = await database.get<Workout>('workouts').create(w => {
                w.userId = userId;
                w.name = workoutName;
                w.workoutType = 'strength'; // Default for now
                w.startedAt = session.date;
                w.endedAt = session.date + (session.duration * 60 * 1000);
                w.duration = session.duration;
                w.notes = session.notes;
            });

            // 2. Create Exercises and Sets
            for (let i = 0; i < session.exercises.length; i++) {
                const exData = session.exercises[i];

                // Create WorkoutExercise
                const workoutExercise = await database.get<WorkoutExercise>('workout_exercises').create(we => {
                    we.workout.set(workout);
                    we.exerciseId = exData.exerciseId;
                    we.order = i;
                    we.notes = exData.notes;
                });

                // Create Sets
                const setsCollection = database.get<ExerciseSet>('exercise_sets');
                await Promise.all(exData.sets.map(setData =>
                    setsCollection.create(s => {
                        s.workoutExercise.set(workoutExercise);
                        s.setNumber = setData.setNumber;
                        s.reps = setData.actualReps || 0;
                        s.weight = setData.weight || 0;
                        s.rpe = setData.rpe;
                        s.isCompleted = setData.completed;
                    })
                ));
            }
        });
    };

    const deleteWorkout = async (workoutId: string) => {
        await database.write(async () => {
            const workout = await database.get<Workout>('workouts').find(workoutId);
            await workout.destroyPermanently();
            // WatermelonDB should handle cascading deletes if configured, 
            // but for safety we might need to manually delete children if not set up with 'cascade'
        });
    };

    return { createWorkout, deleteWorkout };
};
