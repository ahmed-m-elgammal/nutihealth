import { create } from 'zustand';
import { database } from '../database';
import { handleError } from '../utils/errors';
import Meal from '../database/models/Meal';
import Food from '../database/models/Food';
import CustomFood from '../database/models/CustomFood';
import {
    createMeal,
    updateMeal,
    deleteMeal,
    getMealsForDate,
    getRecentFoods,
    getFavoriteCustomFoods,
    MealData
} from '../services/api/meals';

interface DailyTotals {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
    sugar: number;
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
                set({ todaysMeals: [], isLoading: false, error: 'Database not initialized' });
                return;
            }

            const meals = await getMealsForDate(date);
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
            await createMeal(mealData);
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
            await updateMeal(id, updates);
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
            await deleteMeal(id);
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

            // Optimization 1.2: Parallelize fetching foods for all meals
            // This avoids the N+1 query problem in the loop
            const foodPromises = todaysMeals.map(meal => meal.foods.fetch());
            const foodsArray = await Promise.all(foodPromises);

            todaysMeals.forEach((meal, index) => {
                totals.calories += meal.totalCalories;
                totals.protein += meal.totalProtein;
                totals.carbs += meal.totalCarbs;
                totals.fats += meal.totalFats;

                // Use the pre-fetched foods
                const foods = foodsArray[index];
                foods.forEach((food: any) => {
                    totals.fiber += (food.fiber || 0) * food.quantity;
                    totals.sugar += (food.sugar || 0) * food.quantity;
                });
            });

            set({ dailyTotals: totals });
        } catch (error) {
            handleError(error, 'mealStore.calculateDailyTotals');
        }
    },

    getRecentFoods: async (limit = 20) => {
        try {
            const foods = await getRecentFoods(limit);

            // Filter unique foods by name (logic preserved from original store)
            const uniqueFoods = foods.filter(
                (food: Food, index: number, self: Food[]) =>
                    index === self.findIndex((f: Food) => f.name === food.name && f.brand === food.brand)
            );

            set({ recentFoods: uniqueFoods });
        } catch (error) {
            handleError(error, 'mealStore.getRecentFoods');
        }
    },

    getFavoriteFoods: async () => {
        try {
            const favorites = await getFavoriteCustomFoods();
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
