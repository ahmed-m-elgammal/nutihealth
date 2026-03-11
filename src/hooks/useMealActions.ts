import { useCallback } from 'react';
import { Alert } from 'react-native';
import { database } from '../database';
import Meal from '../database/models/Meal';
import Food from '../database/models/Food';
import { createMeal, deleteMeal, updateMeal, type FoodData, type MealData } from '../services/api/meals';
import type { ToastAction, ToastType } from '../store/uiStore';
import { triggerHaptic } from '../utils/haptics';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

type RouterLike = {
    push: (href: any) => void;
};

type ShowToast = (type: ToastType, message: string, duration?: number, action?: ToastAction) => void;

export type MealActionFoodItem = {
    id: string;
    mealId: string;
    mealType: MealType;
    name: string;
    note?: string;
};

const normalizeMealType = (value: string): MealType => {
    const normalized = value.toLowerCase();
    if (normalized === 'breakfast' || normalized === 'lunch' || normalized === 'dinner' || normalized === 'snack') {
        return normalized;
    }
    return 'snack';
};

const mapFoodRecordToData = (food: Food): FoodData => ({
    name: food.name,
    brand: food.brand,
    barcode: food.barcode,
    servingSize: food.servingSize,
    servingUnit: food.servingUnit,
    quantity: food.quantity,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fats: food.fats,
    fiber: food.fiber,
    sugar: food.sugar,
    note: food.note,
});

const toMealDataFromRecord = async (mealRecord: Meal): Promise<MealData> => {
    const foods = await mealRecord.foods.fetch();

    return {
        name: mealRecord.name,
        mealType: normalizeMealType(mealRecord.mealType || 'snack'),
        consumedAt: new Date(mealRecord.consumedAt),
        photoUri: mealRecord.photoUri,
        notes: mealRecord.notes,
        foods: foods.map((food) => mapFoodRecordToData(food)),
    };
};

export function useMealActions({ router, showToast }: { router: RouterLike; showToast: ShowToast }) {
    const saveFoodNote = useCallback(async (foodItem: MealActionFoodItem, nextNote: string) => {
        const mealRecord = await database.get<Meal>('meals').find(foodItem.mealId);
        const mealFoods = await mealRecord.foods.fetch();
        const updatedFoods = mealFoods.map((food) => ({
            ...mapFoodRecordToData(food),
            note: food.id === foodItem.id ? nextNote : food.note,
        }));
        await updateMeal(foodItem.mealId, { foods: updatedFoods });
    }, []);

    const handleDeleteFood = useCallback(
        async (foodItem: MealActionFoodItem) => {
            try {
                const mealRecord = await database.get<Meal>('meals').find(foodItem.mealId);
                const mealFoods = await mealRecord.foods.fetch();
                const snapshot = await toMealDataFromRecord(mealRecord);

                if (mealFoods.length <= 1) {
                    await deleteMeal(mealRecord.id);
                    showToast('warning', `${foodItem.name} removed`, 5000, {
                        label: 'Undo',
                        onPress: () => {
                            createMeal(snapshot)
                                .then(() => {
                                    triggerHaptic('success').catch(() => undefined);
                                    showToast('success', `${foodItem.name} restored`);
                                })
                                .catch((error) => {
                                    const message = error instanceof Error ? error.message : 'Failed to restore food.';
                                    showToast('error', message);
                                });
                        },
                    });
                    return;
                }

                const previousFoods = mealFoods.map((food) => mapFoodRecordToData(food));
                const remainingFoods = mealFoods
                    .filter((food) => food.id !== foodItem.id)
                    .map((food) => mapFoodRecordToData(food));
                await updateMeal(mealRecord.id, { foods: remainingFoods });

                showToast('warning', `${foodItem.name} removed`, 5000, {
                    label: 'Undo',
                    onPress: () => {
                        updateMeal(mealRecord.id, { foods: previousFoods })
                            .then(() => {
                                triggerHaptic('success').catch(() => undefined);
                                showToast('success', `${foodItem.name} restored`);
                            })
                            .catch((error) => {
                                const message = error instanceof Error ? error.message : 'Failed to restore food.';
                                showToast('error', message);
                            });
                    },
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to remove food.';
                showToast('error', message);
            }
        },
        [showToast],
    );

    const handleDuplicateFood = useCallback(
        async (foodItem: MealActionFoodItem) => {
            try {
                const mealRecord = await database.get<Meal>('meals').find(foodItem.mealId);
                const mealFoods = await mealRecord.foods.fetch();
                const sourceFood = mealFoods.find((food) => food.id === foodItem.id);

                if (!sourceFood) {
                    throw new Error('Food item not found.');
                }

                const duplicateMeal: MealData = {
                    name: `${sourceFood.name} (copy)`,
                    mealType: normalizeMealType(mealRecord.mealType || foodItem.mealType),
                    consumedAt: new Date(),
                    notes: mealRecord.notes,
                    foods: [mapFoodRecordToData(sourceFood)],
                };

                await createMeal(duplicateMeal);
                showToast('success', `${foodItem.name} duplicated`, 2500);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to duplicate food.';
                showToast('error', message);
            }
        },
        [showToast],
    );

    const handleEditFood = useCallback(
        (foodItem: MealActionFoodItem) => {
            router.push({
                pathname: '/(modals)/food-details',
                params: {
                    mealId: foodItem.mealId,
                    foodId: foodItem.id,
                },
            });
        },
        [router],
    );

    const handleAddNote = useCallback(
        (foodItem: MealActionFoodItem) => {
            if (typeof Alert.prompt === 'function') {
                Alert.prompt(
                    `Add note to ${foodItem.name}`,
                    'Write a quick note',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Save',
                            onPress: (value?: string) => {
                                if (value == null) return;

                                saveFoodNote(foodItem, value.trim())
                                    .then(() => {
                                        showToast('info', 'Food note saved', 2000);
                                    })
                                    .catch((error) => {
                                        const message = error instanceof Error ? error.message : 'Failed to save note.';
                                        showToast('error', message);
                                    });
                            },
                        },
                    ],
                    'plain-text',
                    foodItem.note || '',
                );
                return;
            }

            router.push({
                pathname: '/(modals)/food-details',
                params: {
                    mealId: foodItem.mealId,
                    foodId: foodItem.id,
                    focusNote: '1',
                },
            });
        },
        [router, saveFoodNote, showToast],
    );

    return {
        handleDeleteFood,
        handleDuplicateFood,
        handleEditFood,
        handleAddNote,
    };
}
