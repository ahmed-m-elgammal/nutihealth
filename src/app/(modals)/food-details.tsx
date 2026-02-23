import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FoodDetailModal from '../../components/meals/FoodDetailModal';
import { database } from '../../database';
import Meal from '../../database/models/Meal';
import { deleteMeal, updateMeal } from '../../services/api/meals';
import { useUIStore } from '../../store/uiStore';

type MealFood = {
    id: string;
    name: string;
    brand?: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
};

export default function FoodDetailsModalScreen() {
    const router = useRouter();
    const showToast = useUIStore((state) => state.showToast);
    const params = useLocalSearchParams<{ food?: string; mealId?: string; foodId?: string; focusNote?: string }>();
    const mealId = typeof params.mealId === 'string' ? params.mealId : undefined;
    const requestedFoodId = typeof params.foodId === 'string' ? params.foodId : undefined;
    const autoFocusNote = params.focusNote === '1';
    const [initialNote, setInitialNote] = useState('');
    const [initialQuantity, setInitialQuantity] = useState(1);
    const [resolvedFoodId, setResolvedFoodId] = useState<string | null>(null);
    const [mealFood, setMealFood] = useState<MealFood | null>(null);

    const parsedFood = useMemo(() => {
        try {
            if (params.food) {
                const parsed = JSON.parse(params.food);
                return {
                    name: parsed.name || 'Food',
                    brand: parsed.brand || 'Unknown brand',
                    calories: Number(parsed.calories) || 0,
                    protein: Number(parsed.protein) || 0,
                    carbs: Number(parsed.carbs) || 0,
                    fats: Number(parsed.fats) || 0,
                    quantity: Number(parsed.quantity) > 0 ? Number(parsed.quantity) : 1,
                    note: typeof parsed.note === 'string' ? parsed.note : '',
                };
            }
        } catch {
            // legacy payload parse failed; fallback to DB below
        }

        return null;
    }, [params.food]);

    const food = parsedFood ||
        mealFood || {
            name: 'Food',
            brand: 'Unknown brand',
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0,
        };

    useEffect(() => {
        if (!mealId) {
            setResolvedFoodId(null);
            setInitialQuantity(parsedFood?.quantity ?? 1);
            setInitialNote(parsedFood?.note ?? '');
            return;
        }

        let isActive = true;

        const loadMealDetails = async () => {
            try {
                const meal = await database.get<Meal>('meals').find(mealId);
                const foods = await meal.foods.fetch();
                const targetFood = (requestedFoodId ? foods.find((food) => food.id === requestedFoodId) : undefined) || foods[0];

                if (!targetFood) {
                    throw new Error('Food entry not found');
                }

                if (isActive) {
                    setResolvedFoodId(targetFood.id);
                    setInitialNote(targetFood.note || '');
                    setInitialQuantity(targetFood.quantity > 0 ? targetFood.quantity : 1);
                    setMealFood({
                        id: targetFood.id,
                        name: targetFood.name || meal.name || 'Food',
                        brand: targetFood.brand || 'Logged food',
                        calories: targetFood.calories,
                        protein: targetFood.protein,
                        carbs: targetFood.carbs,
                        fats: targetFood.fats,
                    });
                }
            } catch {
                if (isActive) {
                    setResolvedFoodId(null);
                    setInitialNote('');
                    setMealFood(null);
                }
            }
        };

        loadMealDetails().catch(() => {
            if (isActive) {
                setResolvedFoodId(null);
                setInitialNote('');
                setMealFood(null);
            }
        });

        return () => {
            isActive = false;
        };
    }, [mealId, parsedFood?.note, parsedFood?.quantity, requestedFoodId]);

    const saveMealChanges = async ({ quantity, note }: { quantity: number; note: string }) => {
        if (!mealId || !resolvedFoodId) {
            showToast('error', 'Unable to update this food entry.');
            return;
        }

        try {
            const meal = await database.get<Meal>('meals').find(mealId);
            const foods = await meal.foods.fetch();
            const targetFood = foods.find((foodItem) => foodItem.id === resolvedFoodId);

            if (!targetFood) {
                throw new Error('Food entry not found.');
            }

            const updatedFoods = foods.map((foodItem) => ({
                name: foodItem.name,
                brand: foodItem.brand,
                barcode: foodItem.barcode,
                servingSize: foodItem.servingSize,
                servingUnit: foodItem.servingUnit,
                quantity: foodItem.id === targetFood.id ? quantity : foodItem.quantity,
                calories: foodItem.calories,
                protein: foodItem.protein,
                carbs: foodItem.carbs,
                fats: foodItem.fats,
                fiber: foodItem.fiber,
                sugar: foodItem.sugar,
                note: foodItem.id === targetFood.id ? note : foodItem.note,
            }));

            await updateMeal(mealId, {
                foods: updatedFoods,
            });

            showToast('success', 'Food updated');
            router.back();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update food.';
            showToast('error', message);
        }
    };

    const removeMeal = async () => {
        if (!mealId || !resolvedFoodId) {
            showToast('error', 'Unable to remove this food entry.');
            return;
        }

        try {
            const meal = await database.get<Meal>('meals').find(mealId);
            const foods = await meal.foods.fetch();

            if (foods.length <= 1) {
                await deleteMeal(mealId);
            } else {
                const remainingFoods = foods
                    .filter((foodItem) => foodItem.id !== resolvedFoodId)
                    .map((foodItem) => ({
                        name: foodItem.name,
                        brand: foodItem.brand,
                        barcode: foodItem.barcode,
                        servingSize: foodItem.servingSize,
                        servingUnit: foodItem.servingUnit,
                        quantity: foodItem.quantity,
                        calories: foodItem.calories,
                        protein: foodItem.protein,
                        carbs: foodItem.carbs,
                        fats: foodItem.fats,
                        fiber: foodItem.fiber,
                        sugar: foodItem.sugar,
                        note: foodItem.note,
                    }));

                await updateMeal(mealId, { foods: remainingFoods });
            }

            showToast('success', 'Food removed');
            router.back();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to remove food.';
            showToast('error', message);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <FoodDetailModal
                food={food}
                initialNote={initialNote}
                initialQuantity={initialQuantity}
                autoFocusNote={autoFocusNote}
                onSave={saveMealChanges}
                onRemove={removeMeal}
            />
        </SafeAreaView>
    );
}
