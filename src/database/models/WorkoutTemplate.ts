import { Model, Query, Relation } from '@nozbe/watermelondb';
import { children, date, field, json, readonly, relation } from '@nozbe/watermelondb/decorators';
import type TemplateExercise from './TemplateExercise';
import type TrainingProgram from './TrainingProgram';
import type WorkoutSchedule from './WorkoutSchedule';
import type { RepType } from '../../types/workout';

interface ExerciseConfig {
    exerciseId: string;
    sets: number;
    reps?: number | string;
    duration?: number;
    repType?: RepType;
    restPeriod?: number;
    rpe?: number;
    weightGuidance?: string;
    notes?: string;
    order?: number;
    isSuperset?: boolean;
    supersetId?: string;
}

export default class WorkoutTemplate extends Model {
    static table = 'workout_templates';
    static associations = {
        training_programs: { type: 'belongs_to' as const, key: 'program_id' },
        template_exercises: { type: 'has_many' as const, foreignKey: 'template_id' },
        workout_schedules: { type: 'has_many' as const, foreignKey: 'template_id' },
    };

    @field('user_id') userId: string;
    @field('program_id') programId?: string;
    @field('name') name: string;
    @field('description') description?: string;
    @field('workout_type') workoutType: string;
    @json('exercises', (json) => json) exercises: ExerciseConfig[];
    @field('is_favorite') isFavorite: boolean;
    @field('use_count') useCount: number;
    @readonly @date('created_at') createdAt: Date;
    @readonly @date('updated_at') updatedAt: Date;

    @relation('training_programs', 'program_id') program: Relation<TrainingProgram>;
    @children('template_exercises') templateExercises: Query<TemplateExercise>;
    @children('workout_schedules') schedules: Query<WorkoutSchedule>;
}
