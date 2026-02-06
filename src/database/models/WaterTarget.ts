import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class WaterTarget extends Model {
    static table = 'water_targets';

    @field('user_id') userId!: string;
    @field('date') date!: number;
    @field('base_target') baseTarget!: number;
    @field('workout_adjustment') workoutAdjustment!: number;
    @field('weather_adjustment') weatherAdjustment!: number;
    @field('total_target') totalTarget!: number;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
}
