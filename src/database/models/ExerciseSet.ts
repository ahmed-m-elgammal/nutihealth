import { Model, Relation } from '@nozbe/watermelondb';
import { field, readonly, date, relation } from '@nozbe/watermelondb/decorators';
import type WorkoutExercise from './WorkoutExercise';

export default class ExerciseSet extends Model {
    static table = 'exercise_sets';
    static associations = {
        workout_exercises: { type: 'belongs_to' as const, key: 'workout_exercise_id' },
    };

    @field('workout_exercise_id') workoutExerciseId: string;
    @field('set_number') setNumber: number;
    @field('reps') reps?: number;
    @field('weight') weight?: number;
    @field('distance') distance?: number;
    @field('duration') duration?: number;
    @field('rpe') rpe?: number;
    @field('is_warmup') isWarmup: boolean;
    @field('is_pr') isPr: boolean;
    @field('is_completed') isCompleted: boolean;
    @readonly @date('created_at') createdAt: Date;
    @readonly @date('updated_at') updatedAt: Date;

    @relation('workout_exercises', 'workout_exercise_id') workoutExercise: Relation<WorkoutExercise>;
}
