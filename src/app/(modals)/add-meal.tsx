import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AddMealSheet from '../../components/meals/AddMealSheet';
import { createMeal, type MealData } from '../../services/api/meals';
import { useAddMealDraftStore, type DraftMealType } from '../../store/addMealDraftStore';
import { useUIStore } from '../../store/uiStore';

export default function AddMealModalScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ mealType?: string }>();
    const showToast = useUIStore((state) => state.showToast);
    const [isSaving, setIsSaving] = useState(false);
    const mealType = useAddMealDraftStore((state) => state.mealType);
    const foods = useAddMealDraftStore((state) => state.foods);
    const clearDraft = useAddMealDraftStore((state) => state.clearDraft);
    const setMealType = useAddMealDraftStore((state) => state.setMealType);

    const preselectedMealType = useMemo(() => {
        const raw = params.mealType;
        if (raw === 'breakfast' || raw === 'lunch' || raw === 'dinner' || raw === 'snack') {
            return raw as DraftMealType;
        }
        return null;
    }, [params.mealType]);

    useEffect(() => {
        clearDraft();
        if (preselectedMealType) {
            setMealType(preselectedMealType);
        }

        return () => {
            clearDraft();
        };
    }, [clearDraft, preselectedMealType, setMealType]);

    const handleSaveMeal = async () => {
        if (isSaving) {
            return;
        }

        if (foods.length === 0) {
            showToast('warning', 'Add at least one food before saving.');
            return;
        }

        setIsSaving(true);
        try {
            const mealData: MealData = {
                name: `${mealType[0].toUpperCase()}${mealType.slice(1)} meal`,
                mealType,
                consumedAt: new Date(),
                foods: foods.map((food) => ({
                    name: food.name,
                    brand: food.brand,
                    barcode: food.barcode,
                    servingSize: food.servingSize || 1,
                    servingUnit: food.servingUnit || 'serving',
                    quantity: food.quantity,
                    calories: food.calories,
                    protein: food.protein,
                    carbs: food.carbs,
                    fats: food.fats,
                    fiber: food.fiber,
                    sugar: food.sugar,
                })),
            };

            await createMeal(mealData);
            showToast('success', 'Meal saved.');
            clearDraft();
            router.back();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save meal.';
            showToast('error', message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <AddMealSheet
                onOpenSearch={() => router.push('/(modals)/food-search')}
                onOpenScan={() => router.push('/(modals)/barcode-scanner')}
                onOpenAiDetect={() => router.push('/(modals)/ai-food-detect')}
                onSaveMeal={handleSaveMeal}
            />
        </SafeAreaView>
    );
}
