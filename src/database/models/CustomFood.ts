import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class CustomFood extends Model {
    static table = 'custom_foods';

    @field('user_id') userId: string;
    @field('name') name: string;
    @field('brand') brand?: string;
    @field('barcode') barcode?: string;
    @field('serving_size') servingSize: number;
    @field('serving_unit') servingUnit: string;
    @field('calories') calories: number;
    @field('protein') protein: number;
    @field('carbs') carbs: number;
    @field('fats') fats: number;
    @field('fiber') fiber?: number;
    @field('sugar') sugar?: number;
    @field('is_favorite') isFavorite: boolean;
    @field('use_count') useCount: number;
    @readonly @date('created_at') createdAt: Date;
    @readonly @date('updated_at') updatedAt: Date;
}
