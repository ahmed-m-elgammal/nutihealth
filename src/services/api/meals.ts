import { database } from '../../database';
import Meal from '../../database/models/Meal';
import Food from '../../database/models/Food';
import User from '../../database/models/User';
import { Q } from '@nozbe/watermelondb';
import { handleError } from '../../utils/errors';
import { getUserId } from '../../utils/storage';

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
    note?: string;
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

type MealTotals = Pick<
    NutritionSummary,
    'totalCalories' | 'totalProtein' | 'totalCarbs' | 'totalFats' | 'totalFiber' | 'totalSugar'
>;

const resolveActiveUserId = async (): Promise<string> => {
    const usersCollection = database.get<User>('users');
    const users = await usersCollection.query().fetch();
    if (users.length === 0) {
        throw new Error('No user found. Please complete onboarding first.');
    }

    const storedUserId = await getUserId();
    if (storedUserId) {
        const matchedUser = users.find((user) => user.id === storedUserId);
        if (matchedUser) {
            return matchedUser.id;
        }
    }

    if (users.length === 1) {
        return users[0].id;
    }

    throw new Error('No active user selected. Please sign in again.');
};

const computeMealTotals = (foods: FoodData[]): MealTotals =>
    foods.reduce(
        (totals, food) => {
            totals.totalCalories += food.calories * food.quantity;
            totals.totalProtein += food.protein * food.quantity;
            totals.totalCarbs += food.carbs * food.quantity;
            totals.totalFats += food.fats * food.quantity;
            totals.totalFiber += (food.fiber || 0) * food.quantity;
            totals.totalSugar += (food.sugar || 0) * food.quantity;
            return totals;
        },
        { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0, totalFiber: 0, totalSugar: 0 },
    );

const createMealFoods = async (mealId: string, foods: FoodData[]) => {
    const foodsCollection = database.get<Food>('foods');

    const preparedFoods = foods.map((foodData) =>
        foodsCollection.prepareCreate((food) => {
            food.mealId = mealId;
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
            food.note = foodData.note;
        }),
    );

    if (preparedFoods.length > 0) {
        await database.batch(...preparedFoods);
    }
};

const removeMealFoods = async (meal: Meal) => {
    const existingFoods = await meal.foods.fetch();
    for (const food of existingFoods) {
        await food.markAsDeleted();
    }
};

/**
 * Create a new meal with foods
 *
 * NOTE: This service operates in offline-first mode using WatermelonDB.
 * When backend is enabled, this will sync via the sync service.
 */
export async function createMeal(mealData: MealData): Promise<Meal> {
    try {
        const userId = await resolveActiveUserId();
        const totals = computeMealTotals(mealData.foods);
        const createdMeal = await database.write(async () => {
            const mealsCollection = database.get<Meal>('meals');
            const newMeal = await mealsCollection.create((meal) => {
                meal.userId = userId;
                meal.name = mealData.name;
                meal.mealType = mealData.mealType;
                meal.consumedAt = mealData.consumedAt.getTime();
                meal.photoUri = mealData.photoUri;
                meal.notes = mealData.notes;
                meal.totalCalories = totals.totalCalories;
                meal.totalProtein = totals.totalProtein;
                meal.totalCarbs = totals.totalCarbs;
                meal.totalFats = totals.totalFats;
                meal.totalFiber = totals.totalFiber;
                meal.totalSugar = totals.totalSugar;
            });

            await createMealFoods(newMeal.id, mealData.foods);

            return newMeal;
        });

        return createdMeal;
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

            if (updates.foods) {
                const totals = computeMealTotals(updates.foods);
                await removeMealFoods(meal);
                await createMealFoods(meal.id, updates.foods);

                await meal.update((m) => {
                    m.totalCalories = totals.totalCalories;
                    m.totalProtein = totals.totalProtein;
                    m.totalCarbs = totals.totalCarbs;
                    m.totalFats = totals.totalFats;
                    m.totalFiber = totals.totalFiber;
                    m.totalSugar = totals.totalSugar;
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
            await removeMealFoods(meal);
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
export async function getMealsForDate(date: Date, userId?: string): Promise<Meal[]> {
    try {
        const activeUserId = userId || (await resolveActiveUserId());
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const mealsCollection = database.get<Meal>('meals');
        const meals = await mealsCollection
            .query(
                Q.where('user_id', Q.eq(activeUserId)),
                Q.where('consumed_at', Q.gte(startOfDay.getTime())),
                Q.where('consumed_at', Q.lte(endOfDay.getTime())),
                Q.sortBy('consumed_at', Q.desc),
            )
            .fetch();

        return meals;
    } catch (error) {
        handleError(error, 'meals.getMealsForDate');
        throw error;
    }
}
