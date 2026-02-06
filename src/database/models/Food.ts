import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, relation } from '@nozbe/watermelondb/decorators';
import type Meal from './Meal';

export default class Food extends Model {
    static table = 'foods';
    static associations = {
        meals: { type: 'belongs_to' as const, key: 'meal_id' },
    };

    @field('meal_id') mealId!: string;
    @field('name') name!: string;
    @field('brand') brand?: string;
    @field('barcode') barcode?: string;
    @field('serving_size') servingSize!: number;
    @field('serving_unit') servingUnit!: string;
    @field('quantity') quantity!: number;
    @field('calories') calories!: number;
    @field('protein') protein!: number;
    @field('carbs') carbs!: number;
    @field('fats') fats!: number;
    @field('fiber') fiber?: number;
    @field('sugar') sugar?: number;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;

    @relation('meals', 'meal_id') meal!: Meal;
}
