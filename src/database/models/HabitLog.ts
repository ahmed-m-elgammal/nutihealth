import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, relation } from '@nozbe/watermelondb/decorators';
import type Habit from './Habit';

export default class HabitLog extends Model {
    static table = 'habit_logs';
    static associations = {
        habits: { type: 'belongs_to' as const, key: 'habit_id' },
    };

    @field('habit_id') habitId: string;
    @field('completed_at') completedAt: number;
    @field('notes') notes?: string;
    @readonly @date('created_at') createdAt: Date;
    @readonly @date('updated_at') updatedAt: Date;

    @relation('habits', 'habit_id') habit: Habit;
}
