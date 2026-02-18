import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, json } from '@nozbe/watermelondb/decorators';

interface Ingredient {
    name: string;
    quantity: number;
    unit: string;
}

export default class Recipe extends Model {
    static table = 'recipes';

    @field('user_id') userId: string;
    @field('name') name: string;
    @field('description') description?: string;
    @field('servings') servings: number;
    @field('prep_time') prepTime?: number;
    @field('cook_time') cookTime?: number;
    @json('ingredients', (json) => json) ingredients: Ingredient[];
    @json('instructions', (json) => json) instructions: string[];
    @field('photo_uri') photoUri?: string;
    @field('calories_per_serving') caloriesPerServing: number;
    @field('protein_per_serving') proteinPerServing: number;
    @field('carbs_per_serving') carbsPerServing: number;
    @field('fats_per_serving') fatsPerServing: number;
    @field('is_favorite') isFavorite: boolean;
    @json('tags', (json) => json) tags?: string[];
    @readonly @date('created_at') createdAt: Date;
    @readonly @date('updated_at') updatedAt: Date;
}
