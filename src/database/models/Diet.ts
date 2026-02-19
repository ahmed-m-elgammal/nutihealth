import { Model } from '@nozbe/watermelondb';
import { field, text, json, readonly, date } from '@nozbe/watermelondb/decorators';

const parseRestrictions = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.map((item) => String(item));
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value) as unknown;
            if (Array.isArray(parsed)) {
                return parsed.map((item) => String(item));
            }
            return value
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
        } catch {
            return value
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
        }
    }

    return [];
};

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
    @json('restrictions', parseRestrictions) restrictions: string[];
    @field('is_active') isActive: boolean;
    @readonly @date('created_at') createdAt: Date;
    @readonly @date('updated_at') updatedAt: Date;
}
