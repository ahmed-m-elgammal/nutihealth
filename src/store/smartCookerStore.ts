import { create } from 'zustand';
import type { SmartCookerMealType } from '../services/api/smartCooker';

export type SuggestionAction = 'viewed' | 'cooked' | 'saved' | 'dismissed';

interface RecordedAction {
    recipeId: string;
    action: SuggestionAction;
    timestamp: number;
}

interface SmartCookerFilters {
    strictness: 'exact' | 'flexible';
    mealType: SmartCookerMealType;
}

interface SmartCookerRequestBase {
    ingredients: Array<{ name_ar: string; quantity: number; unit: string }>;
    excludeRecipeIds: string[];
    dietContext: {
        calorie_target: number;
        remaining_today: number;
        protein_target: number;
        carbs_target: number;
        fats_target: number;
        dietary_restrictions: string[];
        allergies: string[];
    };
}

interface SmartCookerStore {
    // Filters
    filters: SmartCookerFilters;
    setFilters: (update: Partial<SmartCookerFilters>) => void;

    // Request base
    requestBase: SmartCookerRequestBase | null;
    setRequestBase: (base: SmartCookerRequestBase) => void;
    clearRequestBase: () => void;

    // Session
    sessionId: string | null;
    setSessionId: (id: string) => void;

    // Action recording (learning loop)
    pendingActions: RecordedAction[];
    recordAction: (recipeId: string, action: SuggestionAction) => void;
    flushActions: () => RecordedAction[];

    // Build full request payload
    buildRequestPayload: () => (SmartCookerRequestBase & { mealType: SmartCookerMealType; strictness: string }) | null;
}

const useSmartCookerStore = create<SmartCookerStore>((set, get) => ({
    filters: {
        strictness: 'flexible',
        mealType: 'lunch',
    },
    setFilters: (update) =>
        set((state) => ({
            filters: { ...state.filters, ...update },
        })),

    requestBase: null,
    setRequestBase: (base) => set({ requestBase: base }),
    clearRequestBase: () => set({ requestBase: null }),

    sessionId: null,
    setSessionId: (id) => set({ sessionId: id }),

    pendingActions: [],
    recordAction: (recipeId, action) =>
        set((state) => ({
            pendingActions: [
                ...state.pendingActions,
                { recipeId, action, timestamp: Date.now() },
            ],
        })),
    flushActions: () => {
        const actions = get().pendingActions;
        set({ pendingActions: [] });
        return actions;
    },

    buildRequestPayload: () => {
        const { requestBase, filters } = get();
        if (!requestBase) return null;
        return {
            ...requestBase,
            mealType: filters.mealType,
            strictness: filters.strictness,
        };
    },
}));

export default useSmartCookerStore;
