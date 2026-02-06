import { create } from 'zustand';
import { database } from '@database';
import { handleError } from '@utils/errors';
import Meal from '@database/models/Meal';
import Food from '@database/models/Food';
import CustomFood from '@database/models/CustomFood';
import { Q } from '@nozbe/watermelondb';

interface DailyTotals {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
    sugar: number;
}

interface MealData {
    name: string;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    consumedAt: Date;
    photoUri?: string;
    notes?: string;
    foods: FoodData[];
}

interface FoodData {
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

interface MealStore {
    todaysMeals: Meal[];
    selectedDate: Date;
    dailyTotals: DailyTotals;
    recentFoods: Food[];
    favoriteFoods: CustomFood[];
    isLoading: boolean;
    error: string | null;

    // Actions
    setSelectedDate: (date: Date) => void;
    loadMealsForDate: (date: Date) => Promise<void>;
    addMeal: (mealData: MealData) => Promise<void>;
    updateMeal: (id: string, updates: Partial<MealData>) => Promise<void>;
    deleteMeal: (id: string) => Promise<void>;
    calculateDailyTotals: () => Promise<void>;
    getRecentFoods: (limit?: number) => Promise<void>;
    getFavoriteFoods: () => Promise<void>;
    toggleMealFavorite: (customFoodId: string) => Promise<void>;
}

export const useMealStore = create<MealStore>((set, get) => ({
    todaysMeals: [],
    selectedDate: new Date(),
    dailyTotals: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        fiber: 0,
        sugar: 0,
    },
    recentFoods: [],
    favoriteFoods: [],
    isLoading: false,
    error: null,

    setSelectedDate: (date: Date) => {
        set({ selectedDate: date });
        get().loadMealsForDate(date);
    },

    loadMealsForDate: async (date: Date) => {
        try {
            set({ isLoading: true, error: null });

            if (!database) {
                console.warn("MealStore: Database is null");
                set({ todaysMeals: [], isLoading: false });
                return;
            }

            // Get start and end of day in milliseconds
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const mealsCollection = database.get<Meal>('meals');
            const meals = await mealsCollection
                .query(
                    Q.where('consumed_at', Q.gte(startOfDay.getTime())),
                    Q.where('consumed_at', Q.lte(endOfDay.getTime())),
                    Q.sortBy('consumed_at', Q.asc)
                )
                .fetch();

            set({ todaysMeals: meals, isLoading: false });
            await get().calculateDailyTotals();
        } catch (error) {
            handleError(error, 'mealStore.loadMealsForDate');
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    addMeal: async (mealData: MealData) => {
        try {
            set({ isLoading: true, error: null });

            if (!database) {
                console.warn("MealStore: Database is null");
                set({ isLoading: false });
                return;
            }

            // Calculate totals for the meal
            const totalCalories = mealData.foods.reduce((sum, food) => sum + food.calories * food.quantity, 0);
            const totalProtein = mealData.foods.reduce((sum, food) => sum + food.protein * food.quantity, 0);
            const totalCarbs = mealData.foods.reduce((sum, food) => sum + food.carbs * food.quantity, 0);
            const totalFats = mealData.foods.reduce((sum, food) => sum + food.fats * food.quantity, 0);

            await database.write(async () => {
                const mealsCollection = database.get<Meal>('meals');
                const foodsCollection = database.get<Food>('foods');

                // Create the meal
                const meal = await mealsCollection.create((newMeal: any) => {
                    newMeal.name = mealData.name;
                    newMeal.mealType = mealData.mealType;
                    newMeal.consumedAt = mealData.consumedAt.getTime();
                    newMeal.photoUri = mealData.photoUri;
                    newMeal.totalCalories = totalCalories;
                    newMeal.totalProtein = totalProtein;
                    newMeal.totalCarbs = totalCarbs;
                    newMeal.totalFats = totalFats;
                    newMeal.notes = mealData.notes;
                });

                // Create all food items for this meal
                await Promise.all(
                    mealData.foods.map((foodData) =>
                        foodsCollection.create((newFood: any) => {
                            newFood.mealId = meal.id;
                            newFood.name = foodData.name;
                            newFood.brand = foodData.brand;
                            newFood.barcode = foodData.barcode;
                            newFood.servingSize = foodData.servingSize;
                            newFood.servingUnit = foodData.servingUnit;
                            newFood.quantity = foodData.quantity;
                            newFood.calories = foodData.calories;
                            newFood.protein = foodData.protein;
                            newFood.carbs = foodData.carbs;
                            newFood.fats = foodData.fats;
                            newFood.fiber = foodData.fiber || 0;
                            newFood.sugar = foodData.sugar || 0;
                        })
                    )
                );
            });

            // Reload meals for the selected date
            await get().loadMealsForDate(get().selectedDate);
            set({ isLoading: false });
        } catch (error) {
            handleError(error, 'mealStore.addMeal');
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    updateMeal: async (id: string, updates: Partial<MealData>) => {
        try {
            set({ isLoading: true, error: null });

            const mealsCollection = database.get<Meal>('meals');
            const meal = await mealsCollection.find(id);

            await database.write(async () => {
                await meal.update((record: any) => {
                    if (updates.name) record.name = updates.name;
                    if (updates.mealType) record.mealType = updates.mealType;
                    if (updates.consumedAt) record.consumedAt = updates.consumedAt.getTime();
                    if (updates.photoUri !== undefined) record.photoUri = updates.photoUri;
                    if (updates.notes !== undefined) record.notes = updates.notes;

                    // If foods are updated, recalculate totals
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

                // If foods are updated, delete old foods and create new ones
                if (updates.foods) {
                    const foodsCollection = database.get<Food>('foods');
                    const oldFoods = await meal.foods.fetch();

                    // Delete old foods
                    await Promise.all(oldFoods.map((food: any) => food.markAsDeleted()));

                    // Create new foods
                    await Promise.all(
                        updates.foods.map((foodData) =>
                            foodsCollection.create((newFood: any) => {
                                newFood.mealId = meal.id;
                                newFood.name = foodData.name;
                                newFood.brand = foodData.brand;
                                newFood.barcode = foodData.barcode;
                                newFood.servingSize = foodData.servingSize;
                                newFood.servingUnit = foodData.servingUnit;
                                newFood.quantity = foodData.quantity;
                                newFood.calories = foodData.calories;
                                newFood.protein = foodData.protein;
                                newFood.carbs = foodData.carbs;
                                newFood.fats = foodData.fats;
                                newFood.fiber = foodData.fiber || 0;
                                newFood.sugar = foodData.sugar || 0;
                            })
                        )
                    );
                }
            });

            await get().loadMealsForDate(get().selectedDate);
            set({ isLoading: false });
        } catch (error) {
            handleError(error, 'mealStore.updateMeal');
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    deleteMeal: async (id: string) => {
        try {
            set({ isLoading: true, error: null });

            const mealsCollection = database.get<Meal>('meals');
            const meal = await mealsCollection.find(id);

            await database.write(async () => {
                // Delete associated foods first
                const foods = await meal.foods.fetch();
                await Promise.all(foods.map((food: any) => food.markAsDeleted()));

                // Delete the meal
                await meal.markAsDeleted();
            });

            await get().loadMealsForDate(get().selectedDate);
            set({ isLoading: false });
        } catch (error) {
            handleError(error, 'mealStore.deleteMeal');
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    calculateDailyTotals: async () => {
        try {
            const { todaysMeals } = get();

            const totals: DailyTotals = {
                calories: 0,
                protein: 0,
                carbs: 0,
                fats: 0,
                fiber: 0,
                sugar: 0,
            };

            for (const meal of todaysMeals) {
                totals.calories += meal.totalCalories;
                totals.protein += meal.totalProtein;
                totals.carbs += meal.totalCarbs;
                totals.fats += meal.totalFats;

                // Get foods for fiber and sugar
                const foods = await meal.foods.fetch();
                foods.forEach((food: any) => {
                    totals.fiber += (food.fiber || 0) * food.quantity;
                    totals.sugar += (food.sugar || 0) * food.quantity;
                });
            }

            set({ dailyTotals: totals });
        } catch (error) {
            handleError(error, 'mealStore.calculateDailyTotals');
        }
    },

    getRecentFoods: async (limit = 20) => {
        try {
            const foodsCollection = database.get<Food>('foods');
            const foods = await foodsCollection
                .query(
                    Q.sortBy('created_at', Q.desc),
                    Q.take(limit)
                )
                .fetch();

            // Filter unique foods by name
            const uniqueFoods = foods.filter(
                (food, index, self) =>
                    index === self.findIndex((f) => f.name === food.name && f.brand === food.brand)
            );

            set({ recentFoods: uniqueFoods });
        } catch (error) {
            handleError(error, 'mealStore.getRecentFoods');
        }
    },

    getFavoriteFoods: async () => {
        try {
            const customFoodsCollection = database.get<CustomFood>('custom_foods');
            const favorites = await customFoodsCollection
                .query(Q.where('is_favorite', true))
                .fetch();

            set({ favoriteFoods: favorites });
        } catch (error) {
            handleError(error, 'mealStore.getFavoriteFoods');
        }
    },

    toggleMealFavorite: async (customFoodId: string) => {
        try {
            const customFoodsCollection = database.get<CustomFood>('custom_foods');
            const customFood = await customFoodsCollection.find(customFoodId);

            await database.write(async () => {
                await customFood.update((record: any) => {
                    record.isFavorite = !record.isFavorite;
                });
            });

            await get().getFavoriteFoods();
        } catch (error) {
            handleError(error, 'mealStore.toggleMealFavorite');
        }
    },
}));
