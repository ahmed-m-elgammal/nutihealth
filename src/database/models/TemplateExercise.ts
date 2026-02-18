import { Model, Relation } from '@nozbe/watermelondb';
import { date, field, readonly, relation } from '@nozbe/watermelondb/decorators';
import type Exercise from './Exercise';
import type WorkoutTemplate from './WorkoutTemplate';

export default class TemplateExercise extends Model {
    static table = 'template_exercises';
    static associations = {
        workout_templates: { type: 'belongs_to' as const, key: 'template_id' },
        exercises: { type: 'belongs_to' as const, key: 'exercise_id' },
    };

    @field('template_id') templateId!: string;
    @field('exercise_id') exerciseId!: string;
    @field('sets') sets!: number;
    @field('reps') reps!: number;
    @field('order') order!: number;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;

    @relation('workout_templates', 'template_id') template!: Relation<WorkoutTemplate>;
    @relation('exercises', 'exercise_id') exercise!: Relation<Exercise>;
}
