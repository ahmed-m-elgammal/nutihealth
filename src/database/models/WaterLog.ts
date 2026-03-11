import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class WaterLog extends Model {
    static table = 'water_logs';

    @field('user_id') userId!: string;
    @field('amount') amount!: number;
    @field('logged_at') loggedAt!: number;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
}
