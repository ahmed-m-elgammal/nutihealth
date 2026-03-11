import { api } from '../apiWrapper';
import { suggestSmartCookerRecipes } from './smartCooker';

export interface CookpadIngredientSearchRequest {
    ingredients: string[];
    limit?: number;
}

export interface CookpadIngredientSuggestion {
    cookpad_id: string;
    cookpad_url: string;
    title_ar: string;
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
    servings: number;
}

export interface CookpadIngredientSearchResponse {
    session_id: string;
    suggestions: CookpadIngredientSuggestion[];
    meta?: {
        total_candidates: number;
        total_suggestions: number;
        fetched_recipes?: number;
        search_terms_used?: string[];
    };
}

export async function searchCookpadRecipesByIngredients(
    payload: CookpadIngredientSearchRequest,
): Promise<CookpadIngredientSearchResponse> {
    const suggestPayload = {
        ingredients: payload.ingredients.map((name) => ({
            name_ar: name,
            quantity: 1,
            unit: 'pieces',
        })),
        diet_context: {
            calorie_target: 2200,
            remaining_today: 1400,
            protein_target: 120,
            carbs_target: 220,
            fats_target: 70,
            dietary_restrictions: [],
            allergies: [],
        },
        meal_type: 'lunch' as const,
        strictness: 'flexible' as const,
        limit: payload.limit,
        exclude_recipe_ids: [],
    };

    try {
        const fallbackResponse = await suggestSmartCookerRecipes(suggestPayload);

        return {
            session_id: fallbackResponse.session_id,
            suggestions: fallbackResponse.suggestions.map((item) => ({
                cookpad_id: item.cookpad_id,
                cookpad_url: item.cookpad_url,
                title_ar: item.title_ar,
                photo_url: item.photo_url,
                match_score: item.match_score,
                ingredient_coverage: item.ingredient_coverage,
                missing_ingredients: item.missing_ingredients,
                estimated_nutrition: item.estimated_nutrition,
                prep_time_minutes: item.prep_time_minutes,
                servings: item.servings,
            })),
            meta: {
                total_candidates: fallbackResponse.meta?.total_candidates || 0,
                total_suggestions: fallbackResponse.meta?.total_suggestions || fallbackResponse.suggestions.length,
                fetched_recipes: fallbackResponse.meta?.fetched_recipes,
                search_terms_used: fallbackResponse.meta?.search_terms_used,
            },
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : '';
        const suggestUnavailable =
            message.includes('Cannot POST /api/smart-cooker/suggest') ||
            message.includes('Cannot POST /smart-cooker/suggest');

        if (!suggestUnavailable) {
            throw error;
        }

        return await api.post<CookpadIngredientSearchResponse>('/smart-cooker/search', payload, {
            timeout: 45000,
            suppressErrors: true,
        });
    }
}
