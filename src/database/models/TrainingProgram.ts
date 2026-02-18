import { Model, Query } from '@nozbe/watermelondb';
import { children, date, field, readonly } from '@nozbe/watermelondb/decorators';
import type WorkoutTemplate from './WorkoutTemplate';

export default class TrainingProgram extends Model {
    static table = 'training_programs';
    static associations = {
        workout_templates: { type: 'has_many' as const, foreignKey: 'program_id' },
    };

    @field('name') name!: string;
    @field('description') description?: string;
    @field('level') level!: 'beginner' | 'intermediate' | 'advanced';
    @field('duration_weeks') durationWeeks!: number;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;

    @children('workout_templates') templates!: Query<WorkoutTemplate>;
}
