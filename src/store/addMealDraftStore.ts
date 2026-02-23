import { create } from 'zustand';
import type { SearchResult } from '../services/api/foodSearch';

export type DraftMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type DraftMealFood = {
    id: string;
    sourceId: string;
    name: string;
    brand?: string;
    barcode?: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber?: number;
    sugar?: number;
    servingSize: number;
    servingUnit: string;
    quantity: number;
};

type AddFoodPayload = {
    quantity: number;
    unit: string;
};

interface AddMealDraftState {
    mealType: DraftMealType;
    foods: DraftMealFood[];
    setMealType: (mealType: DraftMealType) => void;
    addFood: (food: SearchResult, payload: AddFoodPayload) => void;
    removeFood: (id: string) => void;
    clearDraft: () => void;
}

const clampQuantity = (value: number): number => {
    if (!Number.isFinite(value) || value <= 0) {
        return 1;
    }

    return Math.max(0.1, Math.min(value, 99));
};

const createDraftFood = (food: SearchResult, payload: AddFoodPayload): DraftMealFood => ({
    id: `draft-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    sourceId: String(food.id),
    name: food.name,
    brand: food.brand,
    barcode: food.barcode,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fats: food.fats,
    fiber: food.fiber,
    sugar: food.sugar,
    servingSize: food.servingSize,
    servingUnit: payload.unit || food.servingUnit || 'serving',
    quantity: clampQuantity(payload.quantity),
});

export const useAddMealDraftStore = create<AddMealDraftState>((set) => ({
    mealType: 'breakfast',
    foods: [],

    setMealType: (mealType) => set({ mealType }),

    addFood: (food, payload) =>
        set((state) => {
            const existing = state.foods.find(
                (item) =>
                    item.sourceId === String(food.id) &&
                    item.servingUnit === (payload.unit || food.servingUnit || 'serving'),
            );

            if (existing) {
                return {
                    foods: state.foods.map((item) =>
                        item.id === existing.id
                            ? {
                                  ...item,
                                  quantity: clampQuantity(item.quantity + payload.quantity),
                              }
                            : item,
                    ),
                };
            }

            return {
                foods: [createDraftFood(food, payload), ...state.foods],
            };
        }),

    removeFood: (id) =>
        set((state) => ({
            foods: state.foods.filter((food) => food.id !== id),
        })),

    clearDraft: () =>
        set({
            mealType: 'breakfast',
            foods: [],
        }),
}));
