import { Model, Query } from '@nozbe/watermelondb';
import { field, readonly, date, json, children } from '@nozbe/watermelondb/decorators';
import type HabitLog from './HabitLog';

interface FrequencyConfig {
    days?: number[]; // 0-6 for Sunday-Saturday
    times_per_week?: number;
    custom_schedule?: any;
}

export default class Habit extends Model {
    static table = 'habits';
    static associations = {
        habit_logs: { type: 'has_many' as const, foreignKey: 'habit_id' },
    };

    @field('user_id') userId: string;
    @field('name') name: string;
    @field('description') description?: string;
    @field('icon') icon?: string;
    @field('color') color?: string;
    @field('frequency') frequency: string;
    @json('frequency_config', (json) => json) frequencyConfig?: FrequencyConfig;
    @field('current_streak') currentStreak: number;
    @field('best_streak') bestStreak: number;
    @field('is_active') isActive: boolean;
    @readonly @date('created_at') createdAt: Date;
    @readonly @date('updated_at') updatedAt: Date;

    @children('habit_logs') logs: Query<HabitLog>;
}
