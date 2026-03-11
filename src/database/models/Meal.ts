import { Model, Query } from '@nozbe/watermelondb';
import { children, date, field, readonly, relation } from '@nozbe/watermelondb/decorators';
import type Food from './Food';
import type Recipe from './Recipe';

export default class Meal extends Model {
    static table = 'meals';
    static associations = {
        foods: { type: 'has_many' as const, foreignKey: 'meal_id' },
        recipes: { type: 'belongs_to' as const, key: 'cooked_from_recipe_id' },
    };

    @field('user_id') userId!: string;
    @field('name') name!: string;
    @field('meal_type') mealType!: string;
    @field('consumed_at') consumedAt!: number;
    @field('photo_uri') photoUri?: string;
    @field('total_calories') totalCalories!: number;
    @field('total_protein') totalProtein!: number;
    @field('total_carbs') totalCarbs!: number;
    @field('total_fats') totalFats!: number;
    @field('total_fiber') totalFiber!: number;
    @field('total_sugar') totalSugar!: number;
    @field('notes') notes?: string;
    @field('cooked_from_recipe_id') cookedFromRecipeId?: string;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;

    @children('foods') foods!: Query<Food>;
    @relation('recipes', 'cooked_from_recipe_id') cookedFromRecipe?: Recipe;
}
