import { useMutation, useQueryClient } from '@tanstack/react-query';
import { database } from '../../database';
import Food from '../../database/models/Food';
import Meal from '../../database/models/Meal';
import { MealData } from '../../services/api/meals';

const MEAL_QUERY_KEY = ['meals'] as const;

const computeTotals = (foods: MealData['foods']) =>
    foods.reduce(
        (acc, food) => {
            acc.totalCalories += food.calories * food.quantity;
            acc.totalProtein += food.protein * food.quantity;
            acc.totalCarbs += food.carbs * food.quantity;
            acc.totalFats += food.fats * food.quantity;
            return acc;
        },
        { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0 },
    );

export const useMealMutations = () => {
    const queryClient = useQueryClient();

    const createMeal = useMutation({
        mutationFn: async (mealData: MealData) => {
            return database.write(async () => {
                const usersCollection = database.get<any>('users');
                const users = await usersCollection.query().fetch();

                if (users.length === 0) {
                    throw new Error('No user found. Please complete onboarding first.');
                }

                const totals = computeTotals(mealData.foods);
                const mealsCollection = database.get<Meal>('meals');
                const foodsCollection = database.get<Food>('foods');

                const meal = await mealsCollection.create((record) => {
                    record.userId = users[0].id;
                    record.name = mealData.name;
                    record.mealType = mealData.mealType;
                    record.consumedAt = mealData.consumedAt.getTime();
                    record.photoUri = mealData.photoUri;
                    record.notes = mealData.notes;
                    record.totalCalories = totals.totalCalories;
                    record.totalProtein = totals.totalProtein;
                    record.totalCarbs = totals.totalCarbs;
                    record.totalFats = totals.totalFats;
                });

                for (const food of mealData.foods) {
                    await foodsCollection.create((foodRecord) => {
                        foodRecord.mealId = meal.id;
                        foodRecord.name = food.name;
                        foodRecord.brand = food.brand;
                        foodRecord.barcode = food.barcode;
                        foodRecord.servingSize = food.servingSize;
                        foodRecord.servingUnit = food.servingUnit;
                        foodRecord.quantity = food.quantity;
                        foodRecord.calories = food.calories;
                        foodRecord.protein = food.protein;
                        foodRecord.carbs = food.carbs;
                        foodRecord.fats = food.fats;
                        foodRecord.fiber = food.fiber;
                        foodRecord.sugar = food.sugar;
                    });
                }

                return meal;
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: MEAL_QUERY_KEY }),
    });

    const updateMeal = useMutation({
        mutationFn: async ({ mealId, updates }: { mealId: string; updates: Partial<MealData> }) => {
            await database.write(async () => {
                const meal = await database.get<Meal>('meals').find(mealId);

                await meal.update((record) => {
                    if (updates.name) record.name = updates.name;
                    if (updates.mealType) record.mealType = updates.mealType;
                    if (updates.consumedAt) record.consumedAt = updates.consumedAt.getTime();
                    if (updates.photoUri !== undefined) record.photoUri = updates.photoUri;
                    if (updates.notes !== undefined) record.notes = updates.notes;
                });

                if (updates.foods) {
                    const oldFoods = await meal.foods.fetch();
                    for (const oldFood of oldFoods) {
                        await oldFood.destroyPermanently();
                    }

                    const totals = computeTotals(updates.foods);
                    const foodsCollection = database.get<Food>('foods');
                    for (const food of updates.foods) {
                        await foodsCollection.create((foodRecord) => {
                            foodRecord.mealId = meal.id;
                            foodRecord.name = food.name;
                            foodRecord.brand = food.brand;
                            foodRecord.barcode = food.barcode;
                            foodRecord.servingSize = food.servingSize;
                            foodRecord.servingUnit = food.servingUnit;
                            foodRecord.quantity = food.quantity;
                            foodRecord.calories = food.calories;
                            foodRecord.protein = food.protein;
                            foodRecord.carbs = food.carbs;
                            foodRecord.fats = food.fats;
                            foodRecord.fiber = food.fiber;
                            foodRecord.sugar = food.sugar;
                        });
                    }

                    await meal.update((record) => {
                        record.totalCalories = totals.totalCalories;
                        record.totalProtein = totals.totalProtein;
                        record.totalCarbs = totals.totalCarbs;
                        record.totalFats = totals.totalFats;
                    });
                }
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: MEAL_QUERY_KEY }),
    });

    const deleteMeal = useMutation({
        mutationFn: async (mealId: string) => {
            await database.write(async () => {
                const meal = await database.get<Meal>('meals').find(mealId);
                const foods = await meal.foods.fetch();
                for (const food of foods) {
                    await food.destroyPermanently();
                }
                await meal.destroyPermanently();
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: MEAL_QUERY_KEY }),
    });

    return {
        createMeal: async (mealData: MealData) => createMeal.mutateAsync(mealData),
        updateMeal: async (mealId: string, updates: Partial<MealData>) => updateMeal.mutateAsync({ mealId, updates }),
        deleteMeal: async (mealId: string) => deleteMeal.mutateAsync(mealId),
        createMealMutation: createMeal,
        updateMealMutation: updateMeal,
        deleteMealMutation: deleteMeal,
    };
};
