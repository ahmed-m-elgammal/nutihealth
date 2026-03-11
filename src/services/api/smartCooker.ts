import { api } from '../apiWrapper';
import { egyptianFoods } from '../../constants/egyptianFoods';

export interface SmartCookerRecipeResponse {
    recipe_id?: string;
    cookpad_id: string;
    source_url: string;
    title: string;
    title_ar?: string;
    title_en?: string;
    author?: string;
    category?: string;
    tags?: string[];
    image_url?: string;
    servings: number;
    prep_time?: number;
    cook_time?: number;
    total_time?: number;
    ingredients: string[];
    ingredients_ar?: string[];
    ingredients_en?: string[];
    instructions: string[];
    nutrition?: {
        calories?: number;
        protein?: number;
        carbs?: number;
        fats?: number;
        fiber?: number;
        confidence?: 'high' | 'medium' | 'low' | string;
        source?: 'tier1' | 'ai' | string;
    };
    per_100g?: {
        calories?: number;
        protein?: number;
        carbs?: number;
        fats?: number;
        fiber?: number;
    };
    fetched_at: number;
    expires_at: number;
}

export interface SmartCookerCookpadDetailResponse extends SmartCookerRecipeResponse {
    matched_query?: string;
}

export type SmartCookerStrictness = 'exact' | 'flexible';
export type SmartCookerMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface SmartCookerIngredientInput {
    name_ar?: string;
    name_en?: string;
    name?: string;
    quantity: number;
    unit: string;
}

export interface SmartCookerDietContext {
    calorie_target: number;
    remaining_today: number;
    protein_target: number;
    carbs_target: number;
    fats_target: number;
    dietary_restrictions?: string[];
    allergies?: string[];
}

export interface SmartCookerSuggestRequest {
    ingredients: Array<SmartCookerIngredientInput | string>;
    diet_context?: SmartCookerDietContext;
    meal_type?: SmartCookerMealType;
    strictness?: SmartCookerStrictness;
    limit?: number;
    exclude_recipe_ids?: string[];
    lang?: 'ar' | 'en';
}

export interface SmartCookerSuggestion {
    cookpad_id: string;
    recipe_id?: string;
    cookpad_url: string;
    title_ar: string;
    title_en?: string;
    photo_url?: string;
    match_score: number;
    ingredient_coverage: number;
    missing_ingredients: string[];
    estimated_nutrition: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
        fiber?: number;
        confidence: 'high' | 'medium' | 'low' | string;
        source?: 'tier1' | 'ai' | string;
    };
    prep_time_minutes?: number | null;
    diet_fit_label: string;
    servings: number;
    macro_alignment_score?: number;
    restriction_compliance_score?: number;
    ingredients_ar?: string[];
    ingredients_en?: string[];
}

export interface SmartCookerSuggestResponse {
    session_id: string;
    suggestions: SmartCookerSuggestion[];
    meta?: {
        total_candidates: number;
        total_suggestions: number;
        strictness?: SmartCookerStrictness;
        meal_type?: SmartCookerMealType;
        remaining_budget?: number;
        fetched_recipes?: number;
        search_terms_used?: string[];
        source?: string;
    };
}

export interface SmartCookerCatalogItem {
    recipe_id: string;
    food_name_ar: string;
    food_name_en: string;
    category?: string;
    ingredients_ar: string[];
    ingredients_en: string[];
    display_name: string;
}

export interface SmartCookerCatalogResponse {
    query: string;
    lang: 'ar' | 'en';
    total: number;
    items: SmartCookerCatalogItem[];
}

export type SmartCookerCookingState = 'before' | 'after';

export interface SmartCookerEstimateIngredientInput {
    name: string;
    quantity: number;
    unit: string;
}

export interface SmartCookerEstimateRequest {
    recipe_id?: string;
    recipe_query?: string;
    ingredients_quantities?: SmartCookerEstimateIngredientInput[];
    serving_size_g?: number;
    cooking_state?: SmartCookerCookingState;
    lang?: 'ar' | 'en';
}

export interface SmartCookerEstimateResponse {
    recipe: {
        recipe_id: string;
        food_name_ar: string;
        food_name_en: string;
        category?: string;
        ingredients_ar: string[];
        ingredients_en: string[];
    };
    cooking_state: SmartCookerCookingState;
    serving_size_g: number;
    total_dish_weight_g: number;
    estimated_nutrition: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
        fiber: number;
        confidence: 'high' | 'medium' | 'low' | string;
        source: 'tier1' | 'ai' | string;
    };
    per_100g: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
        fiber: number;
    };
    unmatched_ingredients: string[];
    ingredient_inputs: SmartCookerEstimateIngredientInput[];
    source: string;
}

const normalizeSearchText = (value: string): string =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06ff\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const extractIngredientTerms = (ingredients: Array<SmartCookerIngredientInput | string>): string[] => {
    const seen = new Set<string>();
    const terms: string[] = [];

    for (const ingredient of ingredients) {
        const raw =
            typeof ingredient === 'string'
                ? ingredient
                : ingredient.name_ar || ingredient.name_en || ingredient.name || '';

        const normalized = normalizeSearchText(raw);
        if (!normalized) continue;

        const parts = normalized
            .split(/[\n,،;؛]/g)
            .map((part) => part.trim())
            .filter(Boolean);

        for (const part of parts) {
            if (seen.has(part)) continue;
            seen.add(part);
            terms.push(part);
        }
    }

    return terms;
};

const isLikelyNetworkError = (error: unknown): boolean => {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return (
        message.includes('network') ||
        message.includes('fetch') ||
        message.includes('timeout') ||
        message.includes('offline') ||
        message.includes('request failed')
    );
};

const buildFallbackSmartCookerResponse = (payload: SmartCookerSuggestRequest): SmartCookerSuggestResponse => {
    const ingredientTerms = extractIngredientTerms(payload.ingredients || []);
    const maxResults = Math.max(1, Math.min(50, payload.limit || 12));

    const scored = egyptianFoods
        .map((food) => {
            const searchableNames = [food.name, ...(food.altNames || [])].map(normalizeSearchText);
            const matchedTerms = ingredientTerms.filter((term) =>
                searchableNames.some((candidate) => candidate.includes(term)),
            );
            const missingTerms = ingredientTerms.filter((term) => !matchedTerms.includes(term));
            const coverage = ingredientTerms.length > 0 ? matchedTerms.length / ingredientTerms.length : 0;
            const matchScore = ingredientTerms.length > 0 ? coverage : 0.25;

            return {
                food,
                coverage,
                matchScore,
                missingTerms,
            };
        })
        .sort((a, b) => b.matchScore - a.matchScore);

    const topMatches = scored.filter((entry) => entry.matchScore > 0).slice(0, maxResults);
    const picked = (topMatches.length > 0 ? topMatches : scored.slice(0, maxResults)).map((entry) => {
        const nutrition = {
            calories: Number(entry.food.calories) || 0,
            protein: Number(entry.food.protein) || 0,
            carbs: Number(entry.food.carbs) || 0,
            fats: Number(entry.food.fats) || 0,
            fiber: Number(entry.food.fiber) || 0,
            confidence: 'low' as const,
            source: 'tier1' as const,
        };

        const ingredientsAr = ingredientTerms.length > 0 ? ingredientTerms : [entry.food.name];
        const coverageLabel =
            entry.coverage >= 0.7 ? 'Excellent match' : entry.coverage >= 0.4 ? 'Good match' : 'Fallback match';

        return {
            cookpad_id: `local-${entry.food.id}`,
            recipe_id: `local-${entry.food.id}`,
            cookpad_url: '',
            title_ar: entry.food.altNames?.find((name) => /[\u0600-\u06ff]/.test(name)) || entry.food.name,
            title_en: entry.food.name,
            photo_url: undefined,
            match_score: Math.max(0.05, Math.min(1, entry.matchScore)),
            ingredient_coverage: Math.max(0, Math.min(1, entry.coverage)),
            missing_ingredients: entry.missingTerms,
            estimated_nutrition: nutrition,
            prep_time_minutes: null,
            diet_fit_label: coverageLabel,
            servings: 1,
            macro_alignment_score: Number((entry.matchScore * 100).toFixed(1)),
            ingredients_ar: ingredientsAr,
            ingredients_en: ingredientsAr,
        };
    });

    return {
        session_id: `local-fallback-${Date.now()}`,
        suggestions: picked,
        meta: {
            total_candidates: egyptianFoods.length,
            total_suggestions: picked.length,
            strictness: payload.strictness || 'flexible',
            meal_type: payload.meal_type || 'lunch',
            source: 'local_egyptian_catalog_fallback',
            search_terms_used: ingredientTerms,
        },
    };
};

export async function getSmartCookerRecipeById(id: string): Promise<SmartCookerRecipeResponse> {
    const normalizedId = String(id || '').trim();
    if (!normalizedId) {
        throw new Error('Recipe id is required');
    }

    return api.get<SmartCookerRecipeResponse>(`/smart-cooker/recipe/${encodeURIComponent(normalizedId)}`);
}

export async function searchSmartCookerCatalog(
    query: string,
    lang: 'ar' | 'en' = 'ar',
    limit: number = 20,
): Promise<SmartCookerCatalogResponse> {
    return api.get<SmartCookerCatalogResponse>('/smart-cooker/catalog', {
        params: {
            query,
            lang,
            limit: String(limit),
        },
        suppressErrors: true,
    });
}

export async function estimateSmartCookerNutrition(
    payload: SmartCookerEstimateRequest,
): Promise<SmartCookerEstimateResponse> {
    return api.post<SmartCookerEstimateResponse>('/smart-cooker/estimate', payload, {
        timeout: 45000,
    });
}

export async function suggestSmartCookerRecipes(
    payload: SmartCookerSuggestRequest,
): Promise<SmartCookerSuggestResponse> {
    return api.post<SmartCookerSuggestResponse>('/smart-cooker/suggest', payload, {
        timeout: 45000,
    });
}

export async function searchSmartCookerRecipes(
    payload: SmartCookerSuggestRequest,
): Promise<SmartCookerSuggestResponse> {
    try {
        return await api.post<SmartCookerSuggestResponse>('/smart-cooker/search', payload, {
            timeout: 45000,
            suppressErrors: true,
        });
    } catch (error) {
        if (!isLikelyNetworkError(error)) {
            throw error;
        }

        return buildFallbackSmartCookerResponse(payload);
    }
}

export async function searchSmartCookerCookpadDetails(
    query: string,
    recipeId?: string,
): Promise<SmartCookerCookpadDetailResponse> {
    const normalizedQuery = String(query || '').trim();
    if (!normalizedQuery && !recipeId) {
        throw new Error('query or recipe id is required');
    }

    return api.get<SmartCookerCookpadDetailResponse>('/smart-cooker/cookpad-details', {
        params: {
            query: normalizedQuery,
            recipe_id: recipeId || '',
        },
        timeout: 45000,
    });
}
