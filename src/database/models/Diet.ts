import { Model } from '@nozbe/watermelondb';
import { field, text, json, readonly, date } from '@nozbe/watermelondb/decorators';

export default class Diet extends Model {
    static table = 'diets';

    @text('name') name: string;
    @text('description') description?: string;
    @text('type') type: 'preset' | 'custom'; // 'preset', 'custom'
    @field('calorie_target') calorieTarget: number;
    @field('protein_target') proteinTarget: number;
    @field('carbs_target') carbsTarget: number;
    @field('fats_target') fatsTarget: number;
    @field('fiber_target') fiberTarget?: number;
    @json('restrictions', (json) => json) restrictions: string[];
    @field('is_active') isActive: boolean;
    @readonly @date('created_at') createdAt: Date;
    @readonly @date('updated_at') updatedAt: Date;
}
