import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, json } from '@nozbe/watermelondb/decorators';

export interface SessionExercise {
    exerciseId: string;
    exerciseName: string;
    sets: Array<{
        setNumber: number;
        targetReps: number;
        actualReps?: number;
        weight?: number;
        completed: boolean;
        rpe?: number;
    }>;
    notes?: string;
}

export default class WorkoutSession extends Model {
    static table = 'workout_sessions';

    @field('user_id') userId!: string;
    @field('plan_id') planId?: string;
    @field('day_id') dayId?: string;
    @field('template_id') templateId?: string;
    @field('started_at') startedAt!: number; // unix ms
    @field('ended_at') endedAt?: number; // unix ms
    @field('duration_minutes') durationMinutes!: number;
    @field('calories_burned') caloriesBurned?: number;
    @field('total_volume_kg') totalVolumeKg?: number;
    @field('intensity') intensity?: string; // 'light'|'moderate'|'heavy'
    @field('notes') notes?: string;
    @json('exercises', (value) => value || []) exercises!: SessionExercise[];
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
}
