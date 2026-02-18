import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, json } from '@nozbe/watermelondb/decorators';

/**
 * Food item data structure for meal templates
 */
export interface TemplateFoodData {
    name: string;
    brand?: string;
    servingSize: number;
    servingUnit: string;
    quantity: number;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber?: number;
    sugar?: number;
}

/**
 * MealTemplate Model
 * 
 * Represents a reusable meal configuration that can be quickly loaded
 * to log meals without re-entering all food items.
 * 
 * Example: "Breakfast Routine" template with eggs, toast, and coffee
 * can be loaded with a single tap instead of adding 3 items manually.
 */
export default class MealTemplate extends Model {
    static table = 'meal_templates';

    @field('user_id') userId!: string;
    @field('name') name!: string;
    @field('description') description?: string;
    @field('meal_type') mealType!: 'breakfast' | 'lunch' | 'dinner' | 'snack';

    // JSON field storing array of food items
    @json('foods_data', (json) => json) foodsData!: TemplateFoodData[];

    // Pre-calculated nutritional totals
    @field('total_calories') totalCalories!: number;
    @field('total_protein') totalProtein!: number;
    @field('total_carbs') totalCarbs!: number;
    @field('total_fats') totalFats!: number;

    @field('is_favorite') isFavorite!: boolean;
    @field('use_count') useCount!: number;

    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;

    /**
     * Increment the use count when template is loaded
     */
    async incrementUseCount(): Promise<void> {
        await this.update((template) => {
            template.useCount = this.useCount + 1;
        });
    }

    /**
     * Toggle favorite status
     */
    async toggleFavorite(): Promise<void> {
        await this.update((template) => {
            template.isFavorite = !this.isFavorite;
        });
    }

    /**
     * Recalculate nutrition totals from foods data
     * Call this after modifying foodsData
     */
    async recalculateNutrition(): Promise<void> {
        const totals = this.foodsData.reduce(
            (acc, food) => ({
                calories: acc.calories + (food.calories * food.quantity),
                protein: acc.protein + (food.protein * food.quantity),
                carbs: acc.carbs + (food.carbs * food.quantity),
                fats: acc.fats + (food.fats * food.quantity),
            }),
            { calories: 0, protein: 0, carbs: 0, fats: 0 }
        );

        await this.update((template) => {
            template.totalCalories = totals.calories;
            template.totalProtein = totals.protein;
            template.totalCarbs = totals.carbs;
            template.totalFats = totals.fats;
        });
    }
}
