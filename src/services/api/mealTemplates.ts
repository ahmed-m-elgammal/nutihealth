import { database } from '../../database';
import MealTemplate from '../../database/models/MealTemplate';
import { TemplateFoodData } from '../../types/models';
import { Q } from '@nozbe/watermelondb';
import { handleError } from '../../utils/errors';
import { createMeal, MealData } from './meals';

/**
 * Meal Template Service
 * 
 * Provides functions to manage meal templates, enabling users to save
 * frequently eaten meals for quick logging.
 */

export interface CreateTemplateData {
    name: string;
    description?: string;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    foods: TemplateFoodData[];
}

/**
 * Create a new meal template
 */
export async function createMealTemplate(data: CreateTemplateData): Promise<MealTemplate> {
    try {
        const template = await database.write(async () => {
            // Get current user
            const usersCollection = database.get<any>('users');
            const users = await usersCollection.query().fetch();

            if (users.length === 0) {
                throw new Error('No user found. Please complete onboarding first.');
            }

            const userId = users[0].id;

            // Calculate nutrition totals
            const totals = data.foods.reduce(
                (acc, food) => ({
                    calories: acc.calories + (food.calories * food.quantity),
                    protein: acc.protein + (food.protein * food.quantity),
                    carbs: acc.carbs + (food.carbs * food.quantity),
                    fats: acc.fats + (food.fats * food.quantity),
                }),
                { calories: 0, protein: 0, carbs: 0, fats: 0 }
            );

            // Create template
            const templatesCollection = database.get<MealTemplate>('meal_templates');
            return await templatesCollection.create((template) => {
                template.userId = userId;
                template.name = data.name;
                template.description = data.description;
                template.mealType = data.mealType;
                template.foodsData = data.foods;
                template.totalCalories = totals.calories;
                template.totalProtein = totals.protein;
                template.totalCarbs = totals.carbs;
                template.totalFats = totals.fats;
                template.isFavorite = false;
                template.useCount = 0;
            });
        });

        return template;
    } catch (error) {
        handleError(error, 'mealTemplates.createMealTemplate');
        throw error;
    }
}

/**
 * Get all meal templates
 */
export async function getAllMealTemplates(): Promise<MealTemplate[]> {
    try {
        const templatesCollection = database.get<MealTemplate>('meal_templates');
        const templates = await templatesCollection
            .query(Q.sortBy('use_count', Q.desc))
            .fetch();

        return templates;
    } catch (error) {
        handleError(error, 'mealTemplates.getAllMealTemplates');
        throw error;
    }
}

/**
 * Get meal templates by meal type
 */
export async function getTemplatesByMealType(
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
): Promise<MealTemplate[]> {
    try {
        const templatesCollection = database.get<MealTemplate>('meal_templates');
        const templates = await templatesCollection
            .query(
                Q.where('meal_type', mealType),
                Q.sortBy('use_count', Q.desc)
            )
            .fetch();

        return templates;
    } catch (error) {
        handleError(error, 'mealTemplates.getTemplatesByMealType');
        throw error;
    }
}

/**
 * Get favorite meal templates
 */
export async function getFavoriteTemplates(): Promise<MealTemplate[]> {
    try {
        const templatesCollection = database.get<MealTemplate>('meal_templates');
        const templates = await templatesCollection
            .query(
                Q.where('is_favorite', true),
                Q.sortBy('use_count', Q.desc)
            )
            .fetch();

        return templates;
    } catch (error) {
        handleError(error, 'mealTemplates.getFavoriteTemplates');
        throw error;
    }
}

/**
 * Load a template and create a meal from it
 * This is the main "quick log" function
 */
export async function loadTemplateAsMeal(
    templateId: string,
    consumedAt?: Date
): Promise<any> {
    try {
        const templatesCollection = database.get<MealTemplate>('meal_templates');
        const template = await templatesCollection.find(templateId);

        // Convert template foods to meal format
        const mealData: MealData = {
            name: template.name,
            mealType: template.mealType,
            consumedAt: consumedAt || new Date(),
            foods: template.foodsData.map(food => ({
                name: food.name,
                brand: food.brand,
                servingSize: food.servingSize,
                servingUnit: food.servingUnit,
                quantity: food.quantity,
                calories: food.calories,
                protein: food.protein,
                carbs: food.carbs,
                fats: food.fats,
                fiber: food.fiber,
                sugar: food.sugar,
            })),
        };

        // Create the meal
        const meal = await createMeal(mealData);

        // Increment template use count
        await template.incrementUseCount();

        return meal;
    } catch (error) {
        handleError(error, 'mealTemplates.loadTemplateAsMeal');
        throw error;
    }
}

/**
 * Update a meal template
 */
export async function updateMealTemplate(
    templateId: string,
    updates: Partial<CreateTemplateData>
): Promise<void> {
    try {
        await database.write(async () => {
            const templatesCollection = database.get<MealTemplate>('meal_templates');
            const template = await templatesCollection.find(templateId);

            await template.update((t) => {
                if (updates.name) t.name = updates.name;
                if (updates.description !== undefined) t.description = updates.description;
                if (updates.mealType) t.mealType = updates.mealType;
                if (updates.foods) {
                    t.foodsData = updates.foods;
                }
            });

            // Recalculate nutrition if foods were updated
            if (updates.foods) {
                await template.recalculateNutrition();
            }
        });
    } catch (error) {
        handleError(error, 'mealTemplates.updateMealTemplate');
        throw error;
    }
}

/**
 * Delete a meal template
 */
export async function deleteMealTemplate(templateId: string): Promise<void> {
    try {
        await database.write(async () => {
            const templatesCollection = database.get<MealTemplate>('meal_templates');
            const template = await templatesCollection.find(templateId);
            await template.markAsDeleted();
        });
    } catch (error) {
        handleError(error, 'mealTemplates.deleteMealTemplate');
        throw error;
    }
}

/**
 * Toggle favorite status of a template
 */
export async function toggleTemplateFavorite(templateId: string): Promise<void> {
    try {
        const templatesCollection = database.get<MealTemplate>('meal_templates');
        const template = await templatesCollection.find(templateId);
        await template.toggleFavorite();
    } catch (error) {
        handleError(error, 'mealTemplates.toggleTemplateFavorite');
        throw error;
    }
}

/**
 * Create a template from an existing meal
 * This allows users to save any logged meal as a template
 */
export async function createTemplateFromMeal(
    mealId: string,
    templateName?: string
): Promise<MealTemplate> {
    try {
        const mealsCollection = database.get<any>('meals');
        const meal = await mealsCollection.find(mealId);

        // Get all foods from the meal
        const foods = await meal.foods.fetch();

        // Convert to template food data
        const templateFoods: TemplateFoodData[] = foods.map((food: any) => ({
            name: food.name,
            brand: food.brand,
            servingSize: food.servingSize,
            servingUnit: food.servingUnit,
            quantity: food.quantity,
            calories: food.calories,
            protein: food.protein,
            carbs: food.carbs,
            fats: food.fats,
            fiber: food.fiber,
            sugar: food.sugar,
        }));

        // Create template
        return await createMealTemplate({
            name: templateName || meal.name,
            mealType: meal.mealType,
            foods: templateFoods,
        });
    } catch (error) {
        handleError(error, 'mealTemplates.createTemplateFromMeal');
        throw error;
    }
}
