import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, json } from '@nozbe/watermelondb/decorators';

interface ExerciseConfig {
    exerciseId: string;
    sets: number;
    reps?: number;
    duration?: number;
    notes?: string;
}

export default class WorkoutTemplate extends Model {
    static table = 'workout_templates';

    @field('user_id') userId!: string;
    @field('name') name!: string;
    @field('description') description?: string;
    @field('workout_type') workoutType!: string;
    @json('exercises', (json) => json) exercises!: ExerciseConfig[];
    @field('is_favorite') isFavorite!: boolean;
    @field('use_count') useCount!: number;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
}
