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
 * 
 * NOTE: This service operates in offline-first mode using WatermelonDB.
 * When backend is enabled, this will sync via the sync service.
 */
export async function createMeal(mealData: MealData): Promise<Meal> {
    try {
        const meal = await database.write(async () => {
            // Get users collection to find user
            const usersCollection = database.get<any>('users');
            const users = await usersCollection.query().fetch();

            if (users.length === 0) {
                throw new Error('No user found. Please complete onboarding first.');
            }

            const userId = users[0].id;

            // Create meal
            const mealsCollection = database.get<Meal>('meals');
            const newMeal = await mealsCollection.create((meal) => {
                meal.userId = userId;
                meal.name = mealData.name;
                meal.mealType = mealData.mealType;
                meal.consumedAt = mealData.consumedAt.getTime();
                meal.photoUri = mealData.photoUri;
                meal.notes = mealData.notes;

                // Calculate totals
                let totalCalories = 0;
                let totalProtein = 0;
                let totalCarbs = 0;
                let totalFats = 0;

                mealData.foods.forEach(food => {
                    totalCalories += food.calories * food.quantity;
                    totalProtein += food.protein * food.quantity;
                    totalCarbs += food.carbs * food.quantity;
                    totalFats += food.fats * food.quantity;
                });

                meal.totalCalories = totalCalories;
                meal.totalProtein = totalProtein;
                meal.totalCarbs = totalCarbs;
                meal.totalFats = totalFats;
            });

            // Create foods
            const foodsCollection = database.get<Food>('foods');
            for (const foodData of mealData.foods) {
                await foodsCollection.create((food) => {
                    food.mealId = newMeal.id;
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
                    food.fiber = foodData.fiber;
                    food.sugar = foodData.sugar;
                });
            }

            return newMeal;
        });

        return meal;
    } catch (error) {
        handleError(error, 'meals.createMeal');
        throw error;
    }
}

/**
 * Update an existing meal
 */
export async function updateMeal(mealId: string, updates: Partial<MealData>): Promise<void> {
    try {
        await database.write(async () => {
            const mealsCollection = database.get<Meal>('meals');
            const meal = await mealsCollection.find(mealId);

            await meal.update((m) => {
                if (updates.name) m.name = updates.name;
                if (updates.mealType) m.mealType = updates.mealType;
                if (updates.consumedAt) m.consumedAt = updates.consumedAt.getTime();
                if (updates.photoUri !== undefined) m.photoUri = updates.photoUri;
                if (updates.notes !== undefined) m.notes = updates.notes;
            });

            // If foods are being updated, delete old ones and create new ones
            if (updates.foods) {
                const oldFoods = await meal.foods.fetch();
                for (const food of oldFoods) {
                    await food.markAsDeleted();
                }

                const foodsCollection = database.get<Food>('foods');
                let totalCalories = 0;
                let totalProtein = 0;
                let totalCarbs = 0;
                let totalFats = 0;

                for (const foodData of updates.foods) {
                    await foodsCollection.create((food) => {
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
                        food.fiber = foodData.fiber;
                        food.sugar = foodData.sugar;
                    });

                    totalCalories += foodData.calories * foodData.quantity;
                    totalProtein += foodData.protein * foodData.quantity;
                    totalCarbs += foodData.carbs * foodData.quantity;
                    totalFats += foodData.fats * foodData.quantity;
                }

                // Update meal totals
                await meal.update((m) => {
                    m.totalCalories = totalCalories;
                    m.totalProtein = totalProtein;
                    m.totalCarbs = totalCarbs;
                    m.totalFats = totalFats;
                });
            }
        });
    } catch (error) {
        handleError(error, 'meals.updateMeal');
        throw error;
    }
}

/**
 * Delete a meal and its foods
 */
export async function deleteMeal(mealId: string): Promise<void> {
    try {
        await database.write(async () => {
            const mealsCollection = database.get<Meal>('meals');
            const meal = await mealsCollection.find(mealId);

            // Delete all foods first
            const foods = await meal.foods.fetch();
            for (const food of foods) {
                await food.markAsDeleted();
            }

            // Delete meal
            await meal.markAsDeleted();
        });
    } catch (error) {
        handleError(error, 'meals.deleteMeal');
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
        const meals = await mealsCollection
            .query(
                Q.where('consumed_at', Q.gte(startOfDay.getTime())),
                Q.where('consumed_at', Q.lte(endOfDay.getTime()))
            )
            .fetch();

        return meals;
    } catch (error) {
        handleError(error, 'meals.getMealsForDate');
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
            const foods = await meal.foods.fetch();

            for (const food of foods) {
                summary.totalCalories += food.calories * food.quantity;
                summary.totalProtein += food.protein * food.quantity;
                summary.totalCarbs += food.carbs * food.quantity;
                summary.totalFats += food.fats * food.quantity;
                summary.totalFiber += (food.fiber || 0) * food.quantity;
                summary.totalSugar += (food.sugar || 0) * food.quantity;
            }
        }

        return summary;
    } catch (error) {
        handleError(error, 'meals.getDailyNutritionSummary');
        throw error;
    }
}

/**
 * Get recently logged foods
 */
export async function getRecentFoods(limit: number = 20): Promise<Food[]> {
    try {
        const foodsCollection = database.get<Food>('foods');
        const foods = await foodsCollection
            .query(Q.sortBy('created_at', Q.desc), Q.take(limit))
            .fetch();

        return foods;
    } catch (error) {
        handleError(error, 'meals.getRecentFoods');
        throw error;
    }
}

/**
 * Get favorite custom foods
 */
export async function getFavoriteCustomFoods(): Promise<CustomFood[]> {
    try {
        const customFoodsCollection = database.get<CustomFood>('custom_foods');
        const foods = await customFoodsCollection
            .query(Q.where('is_favorite', true))
            .fetch();

        return foods;
    } catch (error) {
        handleError(error, 'meals.getFavoriteCustomFoods');
        throw error;
    }
}

/**
 * Create a custom food
 */
export async function createCustomFood(foodData: Omit<FoodData, 'quantity'>): Promise<CustomFood> {
    try {
        const customFood = await database.write(async () => {
            const usersCollection = database.get<any>('users');
            const users = await usersCollection.query().fetch();

            if (users.length === 0) {
                throw new Error('No user found');
            }

            const userId = users[0].id;

            const customFoodsCollection = database.get<CustomFood>('custom_foods');
            return await customFoodsCollection.create((food) => {
                food.userId = userId;
                food.name = foodData.name;
                food.brand = foodData.brand;
                food.barcode = foodData.barcode;
                food.servingSize = foodData.servingSize;
                food.servingUnit = foodData.servingUnit;
                food.calories = foodData.calories;
                food.protein = foodData.protein;
                food.carbs = foodData.carbs;
                food.fats = foodData.fats;
                food.fiber = foodData.fiber;
                food.sugar = foodData.sugar;
                food.isFavorite = false;
                food.useCount = 0;
            });
        });

        return customFood;
    } catch (error) {
        handleError(error, 'meals.createCustomFood');
        throw error;
    }
}
