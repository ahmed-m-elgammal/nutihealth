import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, json } from '@nozbe/watermelondb/decorators';

interface Measurements {
    chest?: number;
    waist?: number;
    hips?: number;
    thigh?: number;
    bicep?: number;
    neck?: number;
}

export default class WeightLog extends Model {
    static table = 'weight_logs';

    @field('user_id') userId!: string;
    @field('weight') weight!: number;
    @field('body_fat_percentage') bodyFatPercentage?: number;
    @field('muscle_mass') muscleMass?: number;
    @json('measurements', (json) => json) measurements?: Measurements;
    @field('photo_uri') photoUri?: string;
    @field('notes') notes?: string;
    @field('logged_at') loggedAt!: number;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
}
