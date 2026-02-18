import { Model, Relation } from '@nozbe/watermelondb';
import { date, field, readonly, relation } from '@nozbe/watermelondb/decorators';
import type User from './User';
import type WorkoutTemplate from './WorkoutTemplate';

export default class WorkoutSchedule extends Model {
    static table = 'workout_schedules';
    static associations = {
        users: { type: 'belongs_to' as const, key: 'user_id' },
        workout_templates: { type: 'belongs_to' as const, key: 'template_id' },
    };

    @field('user_id') userId!: string;
    @field('template_id') templateId!: string;
    @field('day_of_week') dayOfWeek!: string;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;

    @relation('users', 'user_id') user!: Relation<User>;
    @relation('workout_templates', 'template_id') template!: Relation<WorkoutTemplate>;
}
