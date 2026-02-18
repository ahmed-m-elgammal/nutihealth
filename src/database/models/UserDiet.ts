import { Model, Relation } from '@nozbe/watermelondb';
import { field, date, readonly, immutableRelation } from '@nozbe/watermelondb/decorators';
import Diet from './Diet';

export default class UserDiet extends Model {
    static table = 'user_diets';

    static associations = {
        diets: { type: 'belongs_to', key: 'diet_id' },
    } as const;

    @field('user_id') userId: string;
    @field('diet_id') dietId: string;
    @immutableRelation('diets', 'diet_id') diet!: Relation<Diet>;
    @date('start_date') startDate: Date;
    @date('end_date') endDate?: Date;
    @field('is_active') isActive: boolean;
    @field('target_weight') targetWeight?: number;
    @field('weekly_goal') weeklyGoal?: number;
    @readonly @date('created_at') createdAt: Date;
    @readonly @date('updated_at') updatedAt: Date;
}
