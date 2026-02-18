import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, json } from '@nozbe/watermelondb/decorators';

export default class MealPlan extends Model {
    static table = 'meal_plans';

    @field('user_id') userId: string;
    @field('name') name: string;
    @field('description') description?: string;
    @field('start_date') startDate: number;
    @field('end_date') endDate: number;
    @json('plan_data', (json) => json) planData: any;
    @field('is_active') isActive: boolean;
    @field('is_ai_generated') isAiGenerated: boolean;
    @readonly @date('created_at') createdAt: Date;
    @readonly @date('updated_at') updatedAt: Date;
}
