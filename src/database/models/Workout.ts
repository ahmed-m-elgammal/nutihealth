import { Model, Query } from '@nozbe/watermelondb';
import { field, readonly, date, children } from '@nozbe/watermelondb/decorators';
import type WorkoutExercise from './WorkoutExercise';

export default class Workout extends Model {
    static table = 'workouts';
    static associations = {
        workout_exercises: { type: 'has_many' as const, foreignKey: 'workout_id' },
    };

    @field('user_id') userId: string;
    @field('name') name: string;
    @field('workout_type') workoutType: string;
    @field('started_at') startedAt: number;
    @field('ended_at') endedAt?: number;
    @field('duration') duration: number;
    @field('total_volume') totalVolume?: number;
    @field('calories_burned') caloriesBurned?: number;
    @field('notes') notes?: string;
    @field('template_id') templateId?: string;
    @readonly @date('created_at') createdAt: Date;
    @readonly @date('updated_at') updatedAt: Date;

    @children('workout_exercises') exercises: Query<WorkoutExercise>;
}
