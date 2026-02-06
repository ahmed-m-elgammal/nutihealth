import { database } from '../../database';
import Meal from '../../database/models/Meal';
import Food from '../../database/models/Food';
import CustomFood from '../../database/models/CustomFood';
import { Q } from '@nozbe/watermelondb';
import { handleError } from '../../utils/errors';

export interface MealData {
    name: string;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    consumedAt: Date;
    photoUri?: string;
    notes?: string;
    foods: FoodData[];
}

export interface FoodData {
    name: string;
    brand?: string;
    barcode?: string;
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

export interface NutritionSummary {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    totalFiber: number;
    totalSugar: number;
    mealCount: number;
}

/**
 * Create a new meal with foods
 */
export async function createMeal(mealData: MealData): Promise<Meal> {
    try {
        const totalCalories = mealData.foods.reduce((sum, food) => sum + food.calories * food.quantity, 0);
        const totalProtein = mealData.foods.reduce((sum, food) => sum + food.protein * food.quantity, 0);
        const totalCarbs = mealData.foods.reduce((sum, food) => sum + food.carbs * food.quantity, 0);
        const totalFats = mealData.foods.reduce((sum, food) => sum + food.fats * food.quantity, 0);

        let createdMeal: Meal | null = null;

        await database.write(async () => {
            const mealsCollection = database.get<Meal>('meals');
            const foodsCollection = database.get<Food>('foods');

            // Create the meal
            createdMeal = await mealsCollection.create((meal) => {
                meal.name = mealData.name;
                meal.mealType = mealData.mealType;
                meal.consumedAt = mealData.consumedAt.getTime();
                meal.photoUri = mealData.photoUri;
                meal.totalCalories = totalCalories;
                meal.totalProtein = totalProtein;
                meal.totalCarbs = totalCarbs;
                meal.totalFats = totalFats;
                meal.notes = mealData.notes;
            });

            // Create all food items
            await Promise.all(
                mealData.foods.map((foodData) =>
                    foodsCollection.create((food: Food) => {
                        food.mealId = createdMeal!.id;
                        food.name = foodData.name;
                        food.brand = foodData.brand;
                        food.barcode = foodData.barcode;
                        food.servingSize = foodData.servingSize;
                        food.servingUnit = foodData.servingUnit;
                        food.quantity = foodData.quantity;
                        food.calories = foodData.calories;
                        food.protein = foodData.protein;
                        food.carbs = foodData.carbs;
                        food.fats = foodData.fats;
                        food.fiber = foodData.fiber || 0;
                        food.sugar = foodData.sugar || 0;
                    })
                )
            );
        });

        return createdMeal!;
    } catch (error) {
        handleError(error, 'mealsApi.createMeal');
        throw error;
    }
}

/**
 * Update an existing meal
 */
export async function updateMeal(mealId: string, updates: Partial<MealData>): Promise<void> {
    try {
        const mealsCollection = database.get<Meal>('meals');
        const meal = await mealsCollection.find(mealId);

        await database.write(async () => {
            await meal.update((record) => {
                if (updates.name) record.name = updates.name;
                if (updates.mealType) record.mealType = updates.mealType;
                if (updates.consumedAt) record.consumedAt = updates.consumedAt.getTime();
                if (updates.photoUri !== undefined) record.photoUri = updates.photoUri;
                if (updates.notes !== undefined) record.notes = updates.notes;

                if (updates.foods) {
                    const totalCalories = updates.foods.reduce((sum, food) => sum + food.calories * food.quantity, 0);
                    const totalProtein = updates.foods.reduce((sum, food) => sum + food.protein * food.quantity, 0);
                    const totalCarbs = updates.foods.reduce((sum, food) => sum + food.carbs * food.quantity, 0);
                    const totalFats = updates.foods.reduce((sum, food) => sum + food.fats * food.quantity, 0);

                    record.totalCalories = totalCalories;
                    record.totalProtein = totalProtein;
                    record.totalCarbs = totalCarbs;
                    record.totalFats = totalFats;
                }
            });

            // If foods are updated, delete old ones and create new ones
            if (updates.foods) {
                const foodsCollection = database.get<Food>('foods');
                const oldFoods = await meal.foods.fetch();

                await Promise.all(oldFoods.map((food) => food.markAsDeleted()));

                await Promise.all(
                    updates.foods.map((foodData) =>
                        foodsCollection.create((food: Food) => {
                            food.mealId = meal.id;
                            food.name = foodData.name;
                            food.brand = foodData.brand;
                            food.barcode = foodData.barcode;
                            food.servingSize = foodData.servingSize;
                            food.servingUnit = foodData.servingUnit;
                            food.quantity = foodData.quantity;
                            food.calories = foodData.calories;
                            food.protein = foodData.protein;
                            food.carbs = foodData.carbs;
                            food.fats = foodData.fats;
                            food.fiber = foodData.fiber || 0;
                            food.sugar = foodData.sugar || 0;
                        })
                    )
                );
            }
        });
    } catch (error) {
        handleError(error, 'mealsApi.updateMeal');
        throw error;
    }
}

/**
 * Delete a meal and its foods
 */
export async function deleteMeal(mealId: string): Promise<void> {
    try {
        const mealsCollection = database.get<Meal>('meals');
        const meal = await mealsCollection.find(mealId);

        await database.write(async () => {
            const foods = await meal.foods.fetch();
            await Promise.all(foods.map((food) => food.markAsDeleted()));
            await meal.markAsDeleted();
        });
    } catch (error) {
        handleError(error, 'mealsApi.deleteMeal');
        throw error;
    }
}

/**
 * Get meals for a specific date
 */
export async function getMealsForDate(date: Date): Promise<Meal[]> {
    try {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const mealsCollection = database.get<Meal>('meals');
        return await mealsCollection
            .query(
                Q.where('consumed_at', Q.gte(startOfDay.getTime())),
                Q.where('consumed_at', Q.lte(endOfDay.getTime())),
                Q.sortBy('consumed_at', Q.asc)
            )
            .fetch();
    } catch (error) {
        handleError(error, 'mealsApi.getMealsForDate');
        throw error;
    }
}

/**
 * Get daily nutrition summary
 */
export async function getDailyNutritionSummary(date: Date): Promise<NutritionSummary> {
    try {
        const meals = await getMealsForDate(date);

        const summary: NutritionSummary = {
            totalCalories: 0,
            totalProtein: 0,
            totalCarbs: 0,
            totalFats: 0,
            totalFiber: 0,
            totalSugar: 0,
            mealCount: meals.length,
        };

        for (const meal of meals) {
            summary.totalCalories += meal.totalCalories;
            summary.totalProtein += meal.totalProtein;
            summary.totalCarbs += meal.totalCarbs;
            summary.totalFats += meal.totalFats;

            const foods = await meal.foods.fetch();
            foods.forEach((food) => {
                summary.totalFiber += (food.fiber || 0) * food.quantity;
                summary.totalSugar += (food.sugar || 0) * food.quantity;
            });
        }

        return summary;
    } catch (error) {
        handleError(error, 'mealsApi.getDailyNutritionSummary');
        throw error;
    }
}

/**
 * Get recently logged foods
 */
export async function getRecentFoods(limit: number = 20): Promise<Food[]> {
    try {
        const foodsCollection = database.get<Food>('foods');
        return await foodsCollection
            .query(Q.sortBy('created_at', Q.desc), Q.take(limit))
            .fetch();
    } catch (error) {
        handleError(error, 'mealsApi.getRecentFoods');
        throw error;
    }
}

/**
 * Get favorite meals (from custom foods)
 */
export async function getFavoriteMeals(): Promise<CustomFood[]> {
    try {
        const customFoodsCollection = database.get<CustomFood>('custom_foods');
        return await customFoodsCollection
            .query(Q.where('is_favorite', true))
            .fetch();
    } catch (error) {
        handleError(error, 'mealsApi.getFavoriteMeals');
        throw error;
    }
}

/**
 * Create a custom food
 */
export async function createCustomFood(foodData: Omit<FoodData, 'quantity'>): Promise<CustomFood> {
    try {
        let customFood: CustomFood | null = null;

        await database.write(async () => {
            const customFoodsCollection = database.get<CustomFood>('custom_foods');
            customFood = await customFoodsCollection.create((food: CustomFood) => {
                food.name = foodData.name;
                food.brand = foodData.brand;
                food.barcode = foodData.barcode;
                food.servingSize = foodData.servingSize;
                food.servingUnit = foodData.servingUnit;
                food.calories = foodData.calories;
                food.protein = foodData.protein;
                food.carbs = foodData.carbs;
                food.fats = foodData.fats;
                food.fiber = foodData.fiber || 0;
                food.sugar = foodData.sugar || 0;
                food.isFavorite = false;
                food.useCount = 0;
            });
        });

        return customFood!;
    } catch (error) {
        handleError(error, 'mealsApi.createCustomFood');
        throw error;
    }
}

