import { Model, Query, Relation } from '@nozbe/watermelondb';
import { field, readonly, date, relation, children } from '@nozbe/watermelondb/decorators';
import type Workout from './Workout';
import type Exercise from './Exercise';
import type ExerciseSet from './ExerciseSet';

export default class WorkoutExercise extends Model {
    static table = 'workout_exercises';
    static associations = {
        workouts: { type: 'belongs_to' as const, key: 'workout_id' },
        exercises: { type: 'belongs_to' as const, key: 'exercise_id' },
        exercise_sets: { type: 'has_many' as const, foreignKey: 'workout_exercise_id' },
    };

    @field('workout_id') workoutId: string;
    @field('exercise_id') exerciseId: string;
    @field('order') order: number;
    @field('notes') notes?: string;
    @readonly @date('created_at') createdAt: Date;
    @readonly @date('updated_at') updatedAt: Date;

    @relation('workouts', 'workout_id') workout: Relation<Workout>;
    @relation('exercises', 'exercise_id') exercise: Relation<Exercise>;
    @children('exercise_sets') sets: Query<ExerciseSet>;
}
