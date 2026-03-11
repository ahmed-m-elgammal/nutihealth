import { Model, Query } from '@nozbe/watermelondb';
import { children, date, field, json, readonly } from '@nozbe/watermelondb/decorators';
import type Meal from './Meal';

interface Ingredient {
    name: string;
    quantity: number;
    unit: string;
}

export default class Recipe extends Model {
    static table = 'recipes';
    static associations = {
        meals: { type: 'has_many' as const, foreignKey: 'cooked_from_recipe_id' },
    };

    @field('user_id') userId!: string;
    @field('name') name!: string;
    @field('description') description?: string;
    @field('servings') servings!: number;
    @field('prep_time') prepTime?: number;
    @field('cook_time') cookTime?: number;
    @json('ingredients', (json) => json) ingredients!: Ingredient[];
    @json('instructions', (json) => json) instructions!: string[];
    @field('photo_uri') photoUri?: string;
    @field('calories_per_serving') caloriesPerServing!: number;
    @field('protein_per_serving') proteinPerServing!: number;
    @field('carbs_per_serving') carbsPerServing!: number;
    @field('fats_per_serving') fatsPerServing!: number;
    @field('is_favorite') isFavorite!: boolean;
    @json('tags', (json) => json) tags?: string[];
    @field('source_platform') sourcePlatform?: string;
    @field('external_id') externalId?: string;
    @field('nutrition_confidence') nutritionConfidence?: number;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;

    @children('meals') cookedMeals!: Query<Meal>;
}
